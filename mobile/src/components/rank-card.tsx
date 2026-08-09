import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { TIER_META, isRankTier, nextSubTierLabel } from '@/constants/rank';
import { useTheme } from '@/hooks/use-theme';
import type { RankData } from '@/services/api';

const BADGE_SIZE = 56;

type RankCardProps = {
  rank: RankData;
};

export function RankCard({ rank }: RankCardProps) {
  const theme = useTheme();
  const meta = isRankTier(rank.currentTier) ? TIER_META[rank.currentTier] : null;
  const tierColor = meta?.color ?? theme.textSecondary;
  const textColor = meta?.textColor ?? theme.text;
  const tierSoft = `${tierColor}26`;

  const hasNext = rank.rpNeededForNextSubTier !== null;
  const subTierLabel = rank.currentSubTier ?? null;
  const nextLabel = nextSubTierLabel(rank.currentTier, rank.currentSubTier);
  const progressPct = hasNext
    ? Math.min(100, (rank.rpIntoCurrentSubTier / (rank.rpIntoCurrentSubTier + (rank.rpNeededForNextSubTier ?? 0))) * 100)
    : 100;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: tierSoft }]}>
      <View style={[styles.badge, { backgroundColor: tierColor }]}>
        <View style={[styles.badgeRing, { borderColor: textColor }]} />
        {subTierLabel ? (
          <>
            <ThemedText style={[styles.badgeLabel, { color: textColor }]}>{subTierLabel}</ThemedText>
            <View style={[styles.motif, { backgroundColor: textColor }]} />
          </>
        ) : (
          <View style={[styles.radiantDiamond, { backgroundColor: textColor }]} />
        )}
      </View>

      <View style={styles.details}>
        <ThemedText type="smallBold" style={styles.title}>
          {rank.currentTier}
          {subTierLabel ? ` · ${subTierLabel}` : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {rank.totalRP} total RP
        </ThemedText>
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.fill, { backgroundColor: tierColor, width: `${progressPct}%` }]} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {hasNext
            ? `${rank.rpIntoCurrentSubTier}/${rank.rpIntoCurrentSubTier + (rank.rpNeededForNextSubTier ?? 0)} RP to ${nextLabel}`
            : 'Highest rank'}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    opacity: 0.35,
  },
  badgeLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  motif: {
    position: 'absolute',
    bottom: -5,
    width: 18,
    height: 18,
    transform: [{ rotate: '45deg' }],
    opacity: 0.4,
  },
  radiantDiamond: {
    width: 22,
    height: 22,
    transform: [{ rotate: '45deg' }],
    borderRadius: 4,
    opacity: 0.9,
  },
  details: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
