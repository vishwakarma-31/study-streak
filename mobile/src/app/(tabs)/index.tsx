import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';

import { BlockCard } from '@/components/block-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { extractApiError, fetchStreak, fetchToday, isNotFound, type StreakData, type TodayData } from '@/services/api';
import { TODAY_CACHE_KEY, STREAK_CACHE_KEY } from '@/services/cache-keys';
import { formatDayLabel, toDateString } from '@/services/date';
import { flushPendingSync, getLocalLog, getPendingDates, isPending, setLocalLog } from '@/services/logs';
import { getJson, setJson } from '@/services/storage';

const EMPTY_CHECKED = [false, false, false, false];

export default function TodayScreen() {
  const { status } = useAuth();
  const [today, setToday] = useState<TodayData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [checked, setChecked] = useState<boolean[]>(EMPTY_CHECKED);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const checkedRef = useRef<boolean[]>(EMPTY_CHECKED);

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
      }
    }

    setPending(await isPending(date));
  }, [refreshStreak]);

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

    try {
      const data = await fetchToday();
      setToday(data);
      await setJson(TODAY_CACHE_KEY, { date, data });
      setError(null);
    } catch (err) {
      if (!hasUsableCache) {
        setError(extractApiError(err));
      }
    }

    await refreshStreak();
  }, [status, refreshStreak]);

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
    }, 30000);

    return () => {
      netSub.remove();
      sub.remove();
      clearInterval(interval);
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
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.streakRow}>
          <View style={styles.streakBox}>
            <ThemedText type="title" style={styles.streakNumber}>
              {streak ? streak.currentStreak : 0}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              day streak
            </ThemedText>
          </View>
          {pending ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.pendingLabel}>
              Pending sync
            </ThemedText>
          ) : null}
        </View>

        {loading && today === null ? (
          <ActivityIndicator size="large" style={styles.spacer} />
        ) : error && today === null ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.spacer}>
            {error}
          </ThemedText>
        ) : today ? (
          <>
            <View style={styles.header}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Phase {today.phaseNumber} · Week {today.week} · {formatDayLabel(new Date())}
              </ThemedText>
              <ThemedText type="subtitle">{today.topic}</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                {today.phase}
              </ThemedText>
            </View>

            <View style={styles.blocks}>
              {blocks.map((block, index) => (
                <BlockCard
                  key={block.index ?? index}
                  index={index}
                  label={block.label ?? 'Focus'}
                  time={block.time}
                  checked={checked[index] ?? false}
                  onPress={() => void handleToggle(index)}
                />
              ))}
            </View>

            {resources.length > 0 ? (
              <View style={styles.resources}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.resourcesHeading}>
                  Resources this week
                </ThemedText>
                {resources.map((resource, index) => (
                  <ThemedText key={index} type="small" themeColor="textSecondary">
                    {resource.platform ? `${resource.name} — ${resource.platform}` : resource.name}
                  </ThemedText>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
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
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  streakBox: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 64,
    lineHeight: 72,
  },
  pendingLabel: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.three,
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
