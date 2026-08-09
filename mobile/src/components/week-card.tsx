import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RoadmapWeek } from '@/services/api';

const ACCENT = '#3c87f7';
const ACCENT_TINT = 'rgba(60, 135, 247, 0.12)';

type WeekCardProps = {
  week: RoadmapWeek;
  current: boolean;
};

export function WeekCard({ week, current }: WeekCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: current ? ACCENT_TINT : theme.backgroundElement,
          borderColor: current ? ACCENT : theme.backgroundElement,
        },
      ]}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={current ? styles.currentWeekNumber : undefined}>
          Week {week.weekNumber}
        </ThemedText>
        {current ? (
          <ThemedText type="small" style={styles.currentLabel}>
            Current week
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="default">{week.topic}</ThemedText>
      {week.project ? (
        <ThemedText type="small" themeColor="textSecondary">
          Project: {week.project}
        </ThemedText>
      ) : null}
      {week.dsaFocus ? (
        <ThemedText type="small" themeColor="textSecondary">
          DSA: {week.dsaFocus}
        </ThemedText>
      ) : null}
      {week.resources && week.resources.length > 0 ? (
        <View style={styles.resources}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Resources
          </ThemedText>
          {week.resources.map((resource, index) => (
            <ThemedText key={index} type="small" themeColor="textSecondary">
              {resource.platform ? `${resource.name} — ${resource.platform}` : resource.name}
            </ThemedText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.half,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentWeekNumber: {
    color: ACCENT,
  },
  currentLabel: {
    color: ACCENT,
    fontSize: 12,
    lineHeight: 16,
  },
  resources: {
    gap: Spacing.half,
    marginTop: Spacing.one,
  },
});
