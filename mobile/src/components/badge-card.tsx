import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BadgeInfo } from '@/constants/badges';
import { useTheme } from '@/hooks/use-theme';

type BadgeCardProps = {
  info: BadgeInfo;
  earnedDate: string | null;
};

function formatEarnedDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function BadgeCard({ info, earnedDate }: BadgeCardProps) {
  const theme = useTheme();
  const earned = earnedDate !== null;
  const iconColor = earned ? theme.success : theme.textSecondary;
  const iconName = (earned ? info.icon : `${info.icon}-outline`) as BadgeInfo['icon'];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: earned ? theme.successSoft : theme.border },
      ]}>
      <Ionicons name={iconName} size={28} color={iconColor} />
      <ThemedText type="smallBold" style={earned ? { color: theme.success } : undefined}>
        {info.label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        {info.description}
      </ThemedText>
      {earnedDate ? (
        <ThemedText type="small" style={{ color: theme.success }}>
          Earned {formatEarnedDate(earnedDate)}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  description: {
    textAlign: 'center',
  },
});
