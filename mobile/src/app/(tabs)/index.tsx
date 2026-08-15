import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';

import { BlockCard } from '@/components/block-card';
import { FadeInView } from '@/components/fade-in-view';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { extractApiError, fetchCustomTasks, fetchStreak, fetchToday, isNotFound, warmUpServer, type StreakData, type TodayData } from '@/services/api';
import { TODAY_CACHE_KEY, STREAK_CACHE_KEY } from '@/services/cache-keys';
import { formatDayLabel, toDateString } from '@/services/date';
import {
  addLocalCustomTask,
  deleteLocalCustomTask,
  flushPendingCustomTasks,
  flushPendingSync,
  getLocalCustomTasks,
  getLocalLog,
  getPendingCustomTaskDates,
  getPendingDates,
  isCustomTaskPending,
  isPending,
  setLocalLog,
  setServerCustomTasks,
  toggleLocalCustomTask,
  type LocalCustomTask,
} from '@/services/logs';
import { getJson, setJson } from '@/services/storage';
import { useTheme } from '@/hooks/use-theme';

const EMPTY_CHECKED = [false, false, false, false];

const POLL_INTERVAL_MS = 150000;
const SLOW_REQUEST_MS = 1200;

export default function TodayScreen() {
  const { status } = useAuth();
  const theme = useTheme();
  const [today, setToday] = useState<TodayData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [checked, setChecked] = useState<boolean[]>(EMPTY_CHECKED);
  const [pending, setPending] = useState(false);
  const [customTasks, setCustomTasks] = useState<LocalCustomTask[]>([]);
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [customTaskPending, setCustomTaskPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waking, setWaking] = useState(false);
  const checkedRef = useRef<boolean[]>(EMPTY_CHECKED);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginWarm = useCallback(() => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => setWaking(true), SLOW_REQUEST_MS);
  }, []);

  const endWarm = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setWaking(false);
  }, []);

  const refreshStreak = useCallback(async () => {
    try {
      const s = await fetchStreak();
      setStreak(s);
      await setJson(STREAK_CACHE_KEY, s);
    } catch (err) {
      if (isNotFound(err)) {
        setStreak(null);
      }
    }
  }, []);

  const reloadCustomTasks = useCallback(async (date: string) => {
    setCustomTasks(await getLocalCustomTasks(date));
    setCustomTaskPending(await isCustomTaskPending(date));
  }, []);

  const syncNow = useCallback(async () => {
    const date = toDateString(new Date());

    const hasPending = (await getPendingDates()).length > 0;
    const hasPendingTasks = (await getPendingCustomTaskDates()).length > 0;
    if (hasPending || hasPendingTasks) {
      const network = await getNetworkStateAsync();
      if (network.isConnected !== false) {
        beginWarm();
        try {
          const { syncedDates, serverLogs } = await flushPendingSync();
          const { syncedDates: syncedTaskDates } = await flushPendingCustomTasks();

          const server = serverLogs[date];
          const stillPending = await isPending(date);
          if (server && !stillPending) {
            checkedRef.current = server;
            setChecked(server);
          }

          if (syncedDates.length > 0 || syncedTaskDates.length > 0) {
            await refreshStreak();
          }
          await reloadCustomTasks(date);
        } finally {
          endWarm();
        }
      }
    }

    setPending(await isPending(date));
    setCustomTaskPending(await isCustomTaskPending(date));
  }, [refreshStreak, beginWarm, endWarm, reloadCustomTasks]);

  const refresh = useCallback(async () => {
    if (status !== 'signedIn') return;

    const date = toDateString(new Date());
    const cachedToday = await getJson<{ date: string; data: TodayData }>(TODAY_CACHE_KEY);
    const hasUsableCache = cachedToday?.date === date;
    if (hasUsableCache && cachedToday) {
      setToday(cachedToday.data);
    }
    const cachedStreak = await getJson<StreakData>(STREAK_CACHE_KEY);
    if (cachedStreak) {
      setStreak(cachedStreak);
    }

    const log = await getLocalLog(date);
    checkedRef.current = log;
    setChecked(log);
    setPending(await isPending(date));
    await reloadCustomTasks(date);
    setLoading(false);

    beginWarm();
    try {
      await warmUpServer();
      const data = await fetchToday(date);
      setToday(data);
      await setJson(TODAY_CACHE_KEY, { date, data });
      const tasks = await fetchCustomTasks(date);
      await setServerCustomTasks(date, tasks);
      await reloadCustomTasks(date);
      setError(null);
    } catch (err) {
      if (!hasUsableCache) {
        setError(extractApiError(err));
      }
    } finally {
      endWarm();
    }

    await refreshStreak();
  }, [status, refreshStreak, beginWarm, endWarm, reloadCustomTasks]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    Promise.resolve().then(() => void refresh());

    let wasConnected = true;
    const netSub = addNetworkStateListener((state) => {
      const connected = state.isConnected === true;
      if (!wasConnected && connected) {
        void syncNow();
      }
      wasConnected = connected;
    });
    getNetworkStateAsync()
      .then((state) => {
        wasConnected = state.isConnected === true;
      })
      .catch(() => {});

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const interval = setInterval(() => {
      void syncNow();
    }, POLL_INTERVAL_MS);

    return () => {
      netSub.remove();
      sub.remove();
      clearInterval(interval);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [status, refresh, syncNow]);

  const handleToggle = useCallback(async (index: number) => {
    const next = [...checkedRef.current];
    next[index] = !next[index];
    checkedRef.current = next;
    setChecked(next);
    setError(null);
    const date = toDateString(new Date());
    await setLocalLog(date, next);
    setPending(true);
    void syncNow();
  }, [syncNow]);

  const handleAddCustomTask = useCallback(async () => {
    const title = customTaskInput.trim();
    if (!title) return;
    setCustomTaskInput('');
    setError(null);
    const date = toDateString(new Date());
    await addLocalCustomTask(date, title);
    setCustomTaskPending(true);
    await reloadCustomTasks(date);
    void syncNow();
  }, [customTaskInput, syncNow, reloadCustomTasks]);

  const handleToggleCustomTask = useCallback(async (id: string) => {
    const date = toDateString(new Date());
    const task = customTasks.find((t) => t.id === id);
    if (!task) return;
    setError(null);
    await toggleLocalCustomTask(date, id, !task.completed);
    setCustomTaskPending(true);
    await reloadCustomTasks(date);
    void syncNow();
  }, [customTasks, syncNow, reloadCustomTasks]);

  const handleDeleteCustomTask = useCallback(async (id: string) => {
    setError(null);
    const date = toDateString(new Date());
    await deleteLocalCustomTask(date, id);
    setCustomTaskPending(true);
    await reloadCustomTasks(date);
    void syncNow();
  }, [syncNow, reloadCustomTasks]);

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/login" />;

  const blocks = today?.blocks ?? [];
  const resources = today?.resources ?? [];
  const blocksDone = checked.filter(Boolean).length;
  const openTaskCount = customTasks.filter((t) => !t.completed).length;

  let todayNote: string | null = null;
  if (blocksDone >= 3 && openTaskCount > 0) {
    const taskText = openTaskCount === 1 ? '1 task' : `${openTaskCount} tasks`;
    todayNote =
      blocksDone === 4
        ? `All 4 blocks done — ${taskText} left before today counts.`
        : `${blocksDone} of 4 blocks done · ${taskText} left before today counts.`;
  }

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView
          style={[
            styles.streakHeroCard,
            { backgroundColor: theme.tintSoft, borderColor: theme.border },
          ]}>
          <ThemedText type="label" themeColor="textSecondary">
            Streak
          </ThemedText>
          <View style={[styles.ledgerRule, { borderColor: theme.border }]} />
          <View style={styles.streakRow}>
            <ThemedText type="display" style={{ color: theme.tint }}>
              {streak ? streak.currentStreak : 0}
            </ThemedText>
            <View style={styles.streakMeta}>
              <ThemedText type="default">consecutive days</ThemedText>
              {pending ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Pending sync
                </ThemedText>
              ) : null}
            </View>
          </View>
          <View style={[styles.ledgerRule, { borderColor: theme.border }]} />
          <ThemedText type="small" themeColor="textSecondary">
            longest {streak ? streak.longestStreak : 0} · {streak ? streak.totalDaysCompleted : 0}{' '}
            completed in total
          </ThemedText>
        </FadeInView>

        {waking ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.wakingLabel}>
            Waking up the server — the first request of the day can take a moment.
          </ThemedText>
        ) : null}

        {loading && today === null ? (
          <ActivityIndicator size="large" style={styles.spacer} />
        ) : error && today === null ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.spacer}>
            {error}
          </ThemedText>
        ) : today ? (
          <>
            <FadeInView delay={60} style={styles.header}>
              <ThemedText type="label" themeColor="tint">
                Phase {today.phaseNumber} · Week {today.week} · {formatDayLabel(new Date())}
              </ThemedText>
              <ThemedText type="subtitle">{today.task ?? today.topic}</ThemedText>
              {today.needsContent ? (
                <ThemedText type="small" themeColor="textSecondary">
                  The detailed daily plan for this week is being written — the topic and daily blocks
                  below are already live.
                </ThemedText>
              ) : (
                <ThemedText type="default" themeColor="textSecondary">
                  {today.phase}
                </ThemedText>
              )}
            </FadeInView>

            <View style={styles.blocks}>
              {blocks.map((block, index) => (
                <FadeInView key={block.index ?? index} delay={120 + index * 70}>
                  <BlockCard
                    index={index}
                    label={block.label ?? 'Focus'}
                    time={block.time}
                    checked={checked[index] ?? false}
                    onPress={() => void handleToggle(index)}
                  />
                </FadeInView>
              ))}
            </View>

            {todayNote ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.todayNote}>
                {todayNote}
              </ThemedText>
            ) : null}

            <FadeInView delay={120 + blocks.length * 70} style={[styles.customTasksCard, { borderColor: theme.tint, backgroundColor: theme.tintSoft }]}>
              <View style={styles.customTasksHeader}>
                <ThemedText type="label" themeColor="textSecondary">
                  Your tasks today
                </ThemedText>
                {customTaskPending ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Pending sync
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.composer}>
                <TextInput
                  value={customTaskInput}
                  onChangeText={setCustomTaskInput}
                  placeholder="Add a task"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleAddCustomTask()}
                  style={[styles.composerInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add task"
                  onPress={() => void handleAddCustomTask()}
                  disabled={!customTaskInput.trim()}
                  style={({ pressed }) => [
                    styles.addButton,
                    { borderColor: theme.tint },
                    pressed && styles.addPressed,
                    !customTaskInput.trim() && styles.addDisabled,
                  ]}>
                  <ThemedText type="label" themeColor="tint">
                    Add
                  </ThemedText>
                </Pressable>
              </View>
              {customTasks.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No custom tasks yet — optional additions beyond the four blocks.
                </ThemedText>
              ) : (
                <View style={styles.taskList}>
                  {customTasks.map((task) => (
                    <View
                      key={task.id}
                      style={[styles.taskRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: task.completed }}
                        accessibilityLabel={task.title}
                        onPress={() => void handleToggleCustomTask(task.id)}
                        style={[
                          styles.taskCheck,
                          { borderColor: task.completed ? theme.success : theme.textSecondary },
                          task.completed && { backgroundColor: theme.success },
                        ]}>
                        {task.completed ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
                      </Pressable>
                      <ThemedText
                        type="default"
                        numberOfLines={2}
                        style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
                        {task.title}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${task.title}`}
                        onPress={() => void handleDeleteCustomTask(task.id)}
                        hitSlop={8}>
                        <Ionicons name="close" size={18} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </FadeInView>

            {resources.length > 0 ? (
              <FadeInView delay={120 + blocks.length * 70} style={styles.resources}>
                <ThemedText type="label" themeColor="textSecondary" style={styles.resourcesHeading}>
                  Resources this week
                </ThemedText>
                {resources.map((resource, index) => (
                  <ThemedText key={index} type="small" themeColor="textSecondary">
                    {resource.platform ? `${resource.name} — ${resource.platform}` : resource.name}
                  </ThemedText>
                ))}
              </FadeInView>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  streakHeroCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.four,
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  ledgerRule: {
    borderTopWidth: 1,
    marginVertical: Spacing.one,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  streakMeta: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  wakingLabel: {
    alignSelf: 'center',
    textAlign: 'center',
  },
  spacer: {
    marginTop: Spacing.six,
  },
  header: {
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  blocks: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  todayNote: {
    alignSelf: 'center',
    textAlign: 'center',
  },
  customTasksCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  customTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  addPressed: {
    opacity: 0.7,
  },
  addDisabled: {
    opacity: 0.4,
  },
  taskList: {
    gap: Spacing.two,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  taskCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  taskTitle: {
    flex: 1,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  resources: {
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  resourcesHeading: {
    marginBottom: Spacing.half,
  },
});
