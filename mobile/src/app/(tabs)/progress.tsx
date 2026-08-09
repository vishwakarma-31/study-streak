import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { BadgeCard } from '@/components/badge-card';
import { FadeInView } from '@/components/fade-in-view';
import { HEATMAP_WEEKS, Heatmap } from '@/components/heatmap';
import { RankCard } from '@/components/rank-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BADGE_CATALOG } from '@/constants/badges';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import {
  extractApiError,
  fetchBadges,
  fetchRank,
  fetchStreak,
  isNotFound,
  type Badge,
  type RankData,
  type StreakData,
} from '@/services/api';
import { BADGES_CACHE_KEY, RANK_CACHE_KEY, STREAK_CACHE_KEY } from '@/services/cache-keys';
import { getJson, setJson } from '@/services/storage';

export default function ProgressScreen() {
  const { status } = useAuth();
  const theme = useTheme();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rank, setRank] = useState<RankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (status !== 'signedIn') return;

    const cachedStreak = await getJson<StreakData>(STREAK_CACHE_KEY);
    const cachedBadges = await getJson<Badge[]>(BADGES_CACHE_KEY);
    const cachedRank = await getJson<RankData>(RANK_CACHE_KEY);
    if (cachedStreak) setStreak(cachedStreak);
    if (cachedBadges) setBadges(cachedBadges);
    if (cachedRank) setRank(cachedRank);
    setLoading(false);

    try {
      const s = await fetchStreak();
      setStreak(s);
      await setJson(STREAK_CACHE_KEY, s);
      setError(null);
    } catch (err) {
      if (!isNotFound(err) && !cachedStreak) {
        setError(extractApiError(err));
      }
    }

    try {
      const b = await fetchBadges();
      setBadges(b);
      await setJson(BADGES_CACHE_KEY, b);
      setError(null);
    } catch (err) {
      if (!cachedBadges) {
        setError(extractApiError(err));
      }
    }

    try {
      const r = await fetchRank();
      setRank(r);
      await setJson(RANK_CACHE_KEY, r);
      setError(null);
    } catch (err) {
      if (!cachedRank) {
        setError(extractApiError(err));
      }
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    Promise.resolve().then(() => void refresh());
  }, [status, refresh]);

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/login" />;

  const earnedDateByMilestone = new Map(badges.map((b) => [b.milestone, b.achievedDate]));

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Progress</ThemedText>

        {loading && streak === null && badges.length === 0 && rank === null ? (
          <ActivityIndicator size="large" style={styles.spacer} />
        ) : error && streak === null && badges.length === 0 && rank === null ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.spacer}>
            {error}
          </ThemedText>
        ) : (
          <>
            {rank ? (
              <FadeInView style={styles.section}>
                <ThemedText type="label" themeColor="textSecondary">
                  Rank
                </ThemedText>
                <RankCard rank={rank} />
              </FadeInView>
            ) : null}

            <FadeInView delay={80} style={styles.section}>
              <ThemedText type="label" themeColor="textSecondary">
                Last {HEATMAP_WEEKS} weeks
              </ThemedText>
              <View
                style={[
                  styles.heatmapCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <Heatmap history={streak?.history ?? []} />
              </View>
            </FadeInView>

            <FadeInView delay={160} style={styles.statsRow}>
              <View
                style={[
                  styles.statBox,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <ThemedText type="display" style={styles.statNumber}>
                  {streak ? streak.currentStreak : 0}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Current streak
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statBox,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <ThemedText type="display" style={styles.statNumber}>
                  {streak ? streak.longestStreak : 0}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Longest streak
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statBox,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <ThemedText type="display" style={styles.statNumber}>
                  {streak ? streak.totalDaysCompleted : 0}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Days completed
                </ThemedText>
              </View>
            </FadeInView>

            <FadeInView delay={240} style={styles.section}>
              <ThemedText type="label" themeColor="textSecondary">
                Badges
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {badges.length} of {BADGE_CATALOG.length} earned
              </ThemedText>
              <View style={styles.badgesGrid}>
                {BADGE_CATALOG.map((info) => (
                  <BadgeCard
                    key={info.milestone}
                    info={info}
                    earnedDate={earnedDateByMilestone.get(info.milestone) ?? null}
                  />
                ))}
              </View>
            </FadeInView>
          </>
        )}
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
  spacer: {
    marginTop: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  heatmapCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignSelf: 'flex-start',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
  statNumber: {
    fontSize: 32,
    lineHeight: 40,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
