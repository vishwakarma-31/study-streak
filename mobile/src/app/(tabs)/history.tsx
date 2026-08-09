import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { FadeInView } from '@/components/fade-in-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { extractApiError, fetchHistory, type DailyLogEntry } from '@/services/api';

function formatHistoryDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function HistoryRow({ entry }: { entry: DailyLogEntry }) {
  const theme = useTheme();

  return (
    <View style={[styles.rowCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.rowTop}>
        <ThemedText type="smallBold">{formatHistoryDate(entry.date)}</ThemedText>
        {entry.dayCompleted ? (
          <View style={[styles.pill, { backgroundColor: theme.successSoft }]}>
            <Ionicons name="checkmark-circle" size={14} color={theme.success} />
            <ThemedText type="small" style={[styles.pillText, { color: theme.success }]}>
              Completed
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {entry.sessionsCompletedCount} of 4 blocks
          </ThemedText>
        )}
      </View>
      {entry.note ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {entry.note}
        </ThemedText>
      ) : null}
      {entry.dsaProblems.length > 0 ? (
        <View style={styles.chipsRow}>
          {entry.dsaProblems.map((problem) => (
            <View key={problem.title} style={[styles.chip, { backgroundColor: theme.tintSoft }]}>
              <ThemedText type="small" style={[styles.chipText, { color: theme.tint }]}>
                {problem.title}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function HistoryScreen() {
  const { status } = useAuth();
  const theme = useTheme();
  const [logs, setLogs] = useState<DailyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchHistory();
      setLogs(data);
      setError(null);
      setLastSynced(new Date());
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    void (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [status, refresh]);

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/login" />;

  const emptyState = loading ? (
    <ActivityIndicator size="large" style={styles.spacer} />
  ) : error ? (
    <View style={styles.emptyWrap}>
      <View style={[styles.iconCircle, { backgroundColor: theme.tintSoft }]}>
        <Ionicons name="cloud-offline-outline" size={32} color={theme.tint} />
      </View>
      <ThemedText type="default" style={styles.emptyTitle}>
        Could not load history
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
        {error} — pull down to try again.
      </ThemedText>
    </View>
  ) : (
    <FadeInView style={styles.emptyWrap}>
      <View style={[styles.iconCircle, { backgroundColor: theme.tintSoft }]}>
        <Ionicons name="time-outline" size={32} color={theme.tint} />
      </View>
      <ThemedText type="default" style={styles.emptyTitle}>
        Nothing here yet
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
        Past daily notes and DSA problem logs will show up here as you work through the roadmap.
      </ThemedText>
    </FadeInView>
  );

  const footer =
    logs.length > 0 ? (
      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          {lastSynced
            ? `Last synced ${lastSynced.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
            : 'Pull down to refresh'}
        </ThemedText>
      </View>
    ) : null;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">History</ThemedText>
        <ThemedText type="label" themeColor="textSecondary">
          Last 60 days
        </ThemedText>
      </View>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => <HistoryRow entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={logs.length === 0 ? styles.emptyContent : styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
            colors={[theme.tint]}
          />
        }
        ListEmptyComponent={emptyState}
        ListFooterComponent={footer}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyContent: {
    flexGrow: 1,
    padding: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  pillText: {
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  chipText: {
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  spacer: {
    marginTop: Spacing.six,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    fontWeight: '700',
  },
  emptyBody: {
    textAlign: 'center',
  },
});
