export type RankTier =
  | 'Iron'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Ascendant'
  | 'Immortal'
  | 'Radiant';

export const TIER_ORDER: RankTier[] = [
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Ascendant',
  'Immortal',
  'Radiant',
];

export type TierMeta = {
  tier: RankTier;
  color: string;
  textColor: string;
};

export const TIER_META: Record<RankTier, TierMeta> = {
  Iron: { tier: 'Iron', color: '#8E8E93', textColor: '#FFFFFF' },
  Bronze: { tier: 'Bronze', color: '#CD7F32', textColor: '#FFFFFF' },
  Silver: { tier: 'Silver', color: '#C0C4C9', textColor: '#1C1C1E' },
  Gold: { tier: 'Gold', color: '#D4AF37', textColor: '#1C1C1E' },
  Platinum: { tier: 'Platinum', color: '#4FC3A7', textColor: '#0B1B14' },
  Diamond: { tier: 'Diamond', color: '#4FC3F7', textColor: '#0B1B24' },
  Ascendant: { tier: 'Ascendant', color: '#7E57C2', textColor: '#FFFFFF' },
  Immortal: { tier: 'Immortal', color: '#C62828', textColor: '#FFFFFF' },
  Radiant: { tier: 'Radiant', color: '#FFC24B', textColor: '#3A2A00' },
};

export function isRankTier(tier: string): tier is RankTier {
  return TIER_ORDER.includes(tier as RankTier);
}

export function nextSubTierLabel(tier: string, subTier: string | null): string {
  if (subTier === 'I') return 'II';
  if (subTier === 'II') return 'III';
  if (subTier === 'III') {
    const index = TIER_ORDER.indexOf(tier as RankTier);
    const nextTier = TIER_ORDER[index + 1];
    return nextTier ? `${nextTier} I` : '';
  }
  return '';
}
