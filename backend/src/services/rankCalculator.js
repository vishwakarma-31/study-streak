const SUB_TIER_WIDTH = 100;
const DAY_COMPLETION_RP = 20;
const PHASE_PROJECT_BONUS_RP = 50;
const SUB_TIER_NAMES = ['I', 'II', 'III'];

const TIERS = [
  { name: 'Iron', minRP: 0, maxRP: 299, subTiers: 3 },
  { name: 'Bronze', minRP: 300, maxRP: 599, subTiers: 3 },
  { name: 'Silver', minRP: 600, maxRP: 899, subTiers: 3 },
  { name: 'Gold', minRP: 900, maxRP: 1199, subTiers: 3 },
  { name: 'Platinum', minRP: 1200, maxRP: 1499, subTiers: 3 },
  { name: 'Diamond', minRP: 1500, maxRP: 1799, subTiers: 3 },
  { name: 'Ascendant', minRP: 1800, maxRP: 2099, subTiers: 3 },
  { name: 'Immortal', minRP: 2100, maxRP: 2399, subTiers: 3 },
  { name: 'Radiant', minRP: 2400, maxRP: Infinity, subTiers: 0 },
];

function tierForRP(totalRP) {
  const value = Math.max(Number(totalRP) || 0, 0);
  const tier = TIERS.find((t) => value <= t.maxRP) || TIERS[TIERS.length - 1];
  const offset = value - tier.minRP;

  if (tier.subTiers === 0) {
    return {
      tier: tier.name,
      subTier: null,
      rpIntoCurrentSubTier: offset,
      rpNeededForNextSubTier: null,
    };
  }

  const subTierIndex = Math.min(Math.floor(offset / SUB_TIER_WIDTH), SUB_TIER_NAMES.length - 1);
  const rpIntoCurrentSubTier = offset % SUB_TIER_WIDTH;
  return {
    tier: tier.name,
    subTier: SUB_TIER_NAMES[subTierIndex],
    rpIntoCurrentSubTier,
    rpNeededForNextSubTier: SUB_TIER_WIDTH - rpIntoCurrentSubTier,
  };
}

function rankStateForRP(totalRP) {
  const value = Math.max(Number(totalRP) || 0, 0);
  const placement = tierForRP(value);
  return {
    totalRP: value,
    currentTier: placement.tier,
    currentSubTier: placement.subTier,
    rpIntoCurrentSubTier: placement.rpIntoCurrentSubTier,
  };
}

function defaultRankState() {
  return rankStateForRP(0);
}

// Rank is a strictly cumulative track: RP only moves forward. A completed day
// adds DAY_COMPLETION_RP; an uncompleted day changes nothing (never decreases,
// even if a previously-counted day is later unmarked). Mirrors streakCalculator's
// pure, non-mutating contract.
function applyDayCompletion(rankState = {}, { dayCompleted }) {
  if (!dayCompleted) {
    const totalRP = rankState.totalRP || 0;
    return { rankState: rankStateForRP(totalRP), rankChanged: false };
  }
  const totalRP = (rankState.totalRP || 0) + DAY_COMPLETION_RP;
  return { rankState: rankStateForRP(totalRP), rankChanged: true };
}

function applyPhaseBonus(rankState = {}) {
  const totalRP = (rankState.totalRP || 0) + PHASE_PROJECT_BONUS_RP;
  return { rankState: rankStateForRP(totalRP), rankChanged: true };
}

module.exports = {
  TIERS,
  SUB_TIER_NAMES,
  SUB_TIER_WIDTH,
  DAY_COMPLETION_RP,
  PHASE_PROJECT_BONUS_RP,
  tierForRP,
  rankStateForRP,
  defaultRankState,
  applyDayCompletion,
  applyPhaseBonus,
};
