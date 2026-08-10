import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { Ionicons } from '@expo/vector-icons';

import { BlockCard } from '@/components/block-card';
import { FadeInView } from '@/components/fade-in-view';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { extractApiError, fetchStreak, fetchToday, isNotFound, warmUpServer, type StreakData, type TodayData } from '@/services/api';
import { TODAY_CACHE_KEY, STREAK_CACHE_KEY } from '@/services/cache-keys';
import { formatDayLabel, toDateString } from '@/services/date';
import { flushPendingSync, getLocalLog, getPendingDates, isPending, setLocalLog } from '@/services/logs';
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

  const syncNow = useCallback(async () => {
    const date = toDateString(new Date());

    const hasPending = (await getPendingDates()).length > 0;
    if (hasPending) {
      const network = await getNetworkStateAsync();
      if (network.isConnected !== false) {
        beginWarm();
        try {
          const { syncedDates, serverLogs } = await flushPendingSync();

          const server = serverLogs[date];
          const stillPending = await isPending(date);
          if (server && !stillPending) {
            checkedRef.current = server;
            setChecked(server);
          }

          if (syncedDates.length > 0) {
            await refreshStreak();
          }
        } finally {
          endWarm();
        }
      }
    }

    setPending(await isPending(date));
  }, [refreshStreak, beginWarm, endWarm]);

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
    setLoading(false);

    beginWarm();
    try {
      await warmUpServer();
      const data = await fetchToday(date);
      setToday(data);
      await setJson(TODAY_CACHE_KEY, { date, data });
      setError(null);
    } catch (err) {
      if (!hasUsableCache) {
        setError(extractApiError(err));
      }
    } finally {
      endWarm();
    }

    await refreshStreak();
  }, [status, refreshStreak, beginWarm, endWarm]);

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

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/login" />;

  const blocks = today?.blocks ?? [];
  const resources = today?.resources ?? [];

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView
          style={[
            styles.streakHeroCard,
            { backgroundColor: theme.tintSoft, borderColor: theme.border },
          ]}>
          <View style={styles.streakHero}>
            <View style={styles.streakBox}>
              <ThemedText type="display" style={[styles.streakNumber, { color: theme.tint }]}>
                {streak ? streak.currentStreak : 0}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                day streak
              </ThemedText>
            </View>
            <View style={styles.streakAside}>
              <Ionicons name="flame" size={40} color={theme.tint} />
              {pending ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.pendingLabel}>
                  Pending sync
                </ThemedText>
              ) : null}
            </View>
          </View>
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
  },
  streakHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  streakBox: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 64,
    lineHeight: 68,
  },
  streakAside: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  pendingLabel: {
    alignSelf: 'center',
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
  resources: {
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  resourcesHeading: {
    marginBottom: Spacing.half,
  },
});
