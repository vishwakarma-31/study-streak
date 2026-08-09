const {
  tierForRP,
  rankStateForRP,
  defaultRankState,
  applyDayCompletion,
  applyPhaseBonus,
  DAY_COMPLETION_RP,
  PHASE_PROJECT_BONUS_RP,
} = require('../src/services/rankCalculator');

describe('tierForRP', () => {
  test('0 RP is Iron I with a full sub-tier ahead', () => {
    expect(tierForRP(0)).toEqual({
      tier: 'Iron',
      subTier: 'I',
      rpIntoCurrentSubTier: 0,
      rpNeededForNextSubTier: 100,
    });
  });

  test('sub-tier boundaries within Iron', () => {
    expect(tierForRP(99).subTier).toBe('I');
    expect(tierForRP(100).subTier).toBe('II');
    expect(tierForRP(199).subTier).toBe('II');
    expect(tierForRP(200).subTier).toBe('III');
    expect(tierForRP(299).subTier).toBe('III');
  });

  test('tier boundaries', () => {
    expect(tierForRP(300).tier).toBe('Bronze');
    expect(tierForRP(600).tier).toBe('Silver');
    expect(tierForRP(900).tier).toBe('Gold');
    expect(tierForRP(1200).tier).toBe('Platinum');
    expect(tierForRP(1500).tier).toBe('Diamond');
    expect(tierForRP(1800).tier).toBe('Ascendant');
    expect(tierForRP(2100).tier).toBe('Immortal');
    expect(tierForRP(2399).tier).toBe('Immortal');
    expect(tierForRP(2400).tier).toBe('Radiant');
  });

  test('rpIntoCurrentSubTier tracks offset within the sub-tier', () => {
    expect(tierForRP(120).rpIntoCurrentSubTier).toBe(20);
    expect(tierForRP(120).rpNeededForNextSubTier).toBe(80);
    expect(tierForRP(380).rpIntoCurrentSubTier).toBe(80);
    expect(tierForRP(380).rpNeededForNextSubTier).toBe(20);
  });

  test('Radiant is open-ended with no sub-tier', () => {
    expect(tierForRP(2400)).toEqual({
      tier: 'Radiant',
      subTier: null,
      rpIntoCurrentSubTier: 0,
      rpNeededForNextSubTier: null,
    });
    expect(tierForRP(2450).rpIntoCurrentSubTier).toBe(50);
    expect(tierForRP(9999).rpIntoCurrentSubTier).toBe(9999 - 2400);
  });

  test('negative RP clamps to Iron I at 0', () => {
    expect(tierForRP(-50)).toEqual({
      tier: 'Iron',
      subTier: 'I',
      rpIntoCurrentSubTier: 0,
      rpNeededForNextSubTier: 100,
    });
  });
});

describe('rankStateForRP', () => {
  test('produces the stored rankState shape from totalRP', () => {
    expect(rankStateForRP(0)).toEqual({
      totalRP: 0,
      currentTier: 'Iron',
      currentSubTier: 'I',
      rpIntoCurrentSubTier: 0,
    });
    expect(rankStateForRP(320)).toEqual({
      totalRP: 320,
      currentTier: 'Bronze',
      currentSubTier: 'I',
      rpIntoCurrentSubTier: 20,
    });
  });

  test('defaultRankState is Iron I with zero RP', () => {
    expect(defaultRankState()).toEqual({
      totalRP: 0,
      currentTier: 'Iron',
      currentSubTier: 'I',
      rpIntoCurrentSubTier: 0,
    });
  });
});

describe('applyDayCompletion', () => {
  test('a completed day adds DAY_COMPLETION_RP', () => {
    const result = applyDayCompletion({ totalRP: 0 }, { dayCompleted: true });
    expect(result.rankChanged).toBe(true);
    expect(result.rankState.totalRP).toBe(DAY_COMPLETION_RP);
    expect(result.rankState.currentTier).toBe('Iron');
    expect(result.rankState.currentSubTier).toBe('I');
    expect(result.rankState.rpIntoCurrentSubTier).toBe(DAY_COMPLETION_RP);
  });

  test('an uncompleted day changes nothing', () => {
    const result = applyDayCompletion({ totalRP: 100 }, { dayCompleted: false });
    expect(result.rankChanged).toBe(false);
    expect(result.rankState.totalRP).toBe(100);
  });

  test('15 completed days crosses into Bronze', () => {
    let state = {};
    for (let i = 0; i < 15; i += 1) {
      state = applyDayCompletion(state, { dayCompleted: true }).rankState;
    }
    expect(state.totalRP).toBe(300);
    expect(state.currentTier).toBe('Bronze');
    expect(state.currentSubTier).toBe('I');
    expect(state.rpIntoCurrentSubTier).toBe(0);
  });

  test('never decreases, even for an empty state', () => {
    const result = applyDayCompletion({}, { dayCompleted: false });
    expect(result.rankState.totalRP).toBe(0);
  });

  test('works past the Radiant boundary', () => {
    const result = applyDayCompletion({ totalRP: 2400 }, { dayCompleted: true });
    expect(result.rankState.totalRP).toBe(2420);
    expect(result.rankState.currentTier).toBe('Radiant');
    expect(result.rankState.currentSubTier).toBeNull();
  });

  test('does not mutate the input rankState', () => {
    const state = { totalRP: 40 };
    applyDayCompletion(state, { dayCompleted: true });
    expect(state.totalRP).toBe(40);
  });
});

describe('applyPhaseBonus', () => {
  test('adds PHASE_PROJECT_BONUS_RP', () => {
    const result = applyPhaseBonus({ totalRP: 280 });
    expect(result.rankChanged).toBe(true);
    expect(result.rankState.totalRP).toBe(280 + PHASE_PROJECT_BONUS_RP);
    expect(result.rankState.currentTier).toBe('Bronze');
  });
});
