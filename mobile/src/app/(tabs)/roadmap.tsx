import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeekCard } from '@/components/week-card';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  extractApiError,
  fetchRoadmap,
  fetchToday,
  type RoadmapPhase,
  type TodayData,
} from '@/services/api';
import { ROADMAP_CACHE_KEY, TODAY_CACHE_KEY } from '@/services/cache-keys';
import { toDateString } from '@/services/date';
import { getJson, setJson } from '@/services/storage';

const ACCENT = '#3c87f7';
const ACCENT_TINT = 'rgba(60, 135, 247, 0.12)';

export default function RoadmapScreen() {
  const { status } = useAuth();
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [today, setToday] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (status !== 'signedIn') return;

    const date = toDateString(new Date());
    const cachedRoadmap = await getJson<RoadmapPhase[]>(ROADMAP_CACHE_KEY);
    const cachedToday = await getJson<{ date: string; data: TodayData }>(TODAY_CACHE_KEY);
    if (cachedRoadmap) setPhases(cachedRoadmap);
    if (cachedToday?.date === date) setToday(cachedToday.data);
    setLoading(false);

    try {
      const roadmap = await fetchRoadmap();
      setPhases(roadmap);
      await setJson(ROADMAP_CACHE_KEY, roadmap);
      setError(null);
    } catch (err) {
      if (!cachedRoadmap) {
        setError(extractApiError(err));
      }
    }

    try {
      const t = await fetchToday();
      setToday(t);
      await setJson(TODAY_CACHE_KEY, { date, data: t });
      setError(null);
    } catch (err) {
      if (cachedToday?.date !== date) {
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

  const currentWeekKey = today ? `${today.phaseNumber}-${today.week}` : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Roadmap</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          The full 8-phase plan — read-only reference.
        </ThemedText>

        {loading && phases.length === 0 ? (
          <ActivityIndicator size="large" style={styles.spacer} />
        ) : error && phases.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.spacer}>
            {error}
          </ThemedText>
        ) : (
          phases.map((phase) => (
            <View key={phase.phaseNumber} style={styles.phase}>
              <View style={styles.phaseHeader}>
                <View style={[styles.phasePill, { backgroundColor: ACCENT_TINT }]}>
                  <ThemedText style={styles.phasePillText}>Phase {phase.phaseNumber}</ThemedText>
                </View>
                <ThemedText type="default" style={styles.phaseTitle}>
                  {phase.title}
                </ThemedText>
              </View>
              <View style={styles.weeks}>
                {phase.weeks.map((week) => (
                  <WeekCard
                    key={week.weekNumber}
                    week={week}
                    current={currentWeekKey === `${phase.phaseNumber}-${week.weekNumber}`}
                  />
                ))}
              </View>
            </View>
          ))
        )}
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
  spacer: {
    marginTop: Spacing.six,
  },
  phase: {
    gap: Spacing.two,
  },
  phaseHeader: {
    gap: Spacing.one,
  },
  phasePill: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  phasePillText: {
    color: ACCENT,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  phaseTitle: {
    fontWeight: '600',
  },
  weeks: {
    gap: Spacing.two,
  },
});
