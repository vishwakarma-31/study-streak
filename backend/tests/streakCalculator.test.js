const {
  countCompleted,
  isDayCompleted,
  previousDate,
  applyLog,
  midnightReset,
} = require('../src/services/streakCalculator');

const emptyState = { currentStreak: 0, longestStreak: 0, lastCompletedDate: null, totalDaysCompleted: 0 };

describe('countCompleted', () => {
  test('counts true entries only', () => {
    expect(countCompleted([true, false, true, false])).toBe(2);
    expect(countCompleted([true, true, true, true])).toBe(4);
    expect(countCompleted([false, false, false, false])).toBe(0);
  });
});

describe('isDayCompleted (3-of-4 threshold)', () => {
  test('exactly 3 of 4 counts as completed', () => {
    expect(isDayCompleted([true, true, true, false])).toBe(true);
  });

  test('exactly 2 of 4 does NOT count as completed', () => {
    expect(isDayCompleted([true, true, false, false])).toBe(false);
  });

  test('all 4 completed counts', () => {
    expect(isDayCompleted([true, true, true, true])).toBe(true);
  });

  test('none completed does not count', () => {
    expect(isDayCompleted([false, false, false, false])).toBe(false);
  });
});

describe('previousDate', () => {
  test('plain day arithmetic', () => {
    expect(previousDate('2026-08-09')).toBe('2026-08-08');
  });

  test('month boundary', () => {
    expect(previousDate('2026-03-01')).toBe('2026-02-28');
  });

  test('leap year', () => {
    expect(previousDate('2024-03-01')).toBe('2024-02-29');
  });

  test('year boundary', () => {
    expect(previousDate('2026-01-01')).toBe('2025-12-31');
  });
});

describe('applyLog', () => {
  test('first ever completed day starts a streak of 1', () => {
    const result = applyLog(emptyState, {
      date: '2026-08-09',
      sessionsCompleted: [true, true, true, false],
    });
    expect(result.dayCompleted).toBe(true);
    expect(result.sessionsCompletedCount).toBe(3);
    expect(result.streakState.currentStreak).toBe(1);
    expect(result.streakState.longestStreak).toBe(1);
    expect(result.streakState.lastCompletedDate).toBe('2026-08-09');
    expect(result.streakState.totalDaysCompleted).toBe(1);
    expect(result.streakChanged).toBe(true);
  });

  test('consecutive completed days increment the streak', () => {
    let state = emptyState;
    state = applyLog(state, { date: '2026-08-09', sessionsCompleted: [true, true, true, false] }).streakState;
    state = applyLog(state, { date: '2026-08-10', sessionsCompleted: [true, true, true, true] }).streakState;
    expect(state.currentStreak).toBe(2);
    expect(state.totalDaysCompleted).toBe(2);
  });

  test('gap day restarts the streak at 1', () => {
    let state = emptyState;
    state = applyLog(state, { date: '2026-08-09', sessionsCompleted: [true, true, true, false] }).streakState;
    const result = applyLog(state, { date: '2026-08-11', sessionsCompleted: [true, true, true, false] });
    expect(result.streakState.currentStreak).toBe(1);
    expect(result.streakState.lastCompletedDate).toBe('2026-08-11');
    expect(result.streakState.totalDaysCompleted).toBe(2);
  });

  test('same-day duplicate sync does not double-increment', () => {
    let state = emptyState;
    const first = applyLog(state, { date: '2026-08-09', sessionsCompleted: [true, true, true, false] });
    state = first.streakState;
    const second = applyLog(state, { date: '2026-08-09', sessionsCompleted: [true, true, true, true] });
    expect(second.streakState.currentStreak).toBe(1);
    expect(second.streakState.totalDaysCompleted).toBe(1);
    expect(second.streakChanged).toBe(false);
  });

  test('retroactive same-calendar-day sync behaves like same-day', () => {
    let state = emptyState;
    state = applyLog(state, { date: '2026-08-09', sessionsCompleted: [true, true, true, false] }).streakState;
    const retro = applyLog(state, { date: '2026-08-09', sessionsCompleted: [true, true, true, true] });
    expect(retro.streakState.currentStreak).toBe(1);
    expect(retro.streakState.totalDaysCompleted).toBe(1);
  });

  test('longestStreak keeps the max across resets', () => {
    let state = emptyState;
    state = applyLog(state, { date: '2026-08-09', sessionsCompleted: [true, true, true, false] }).streakState;
    state = applyLog(state, { date: '2026-08-10', sessionsCompleted: [true, true, true, false] }).streakState;
    state = applyLog(state, { date: '2026-08-12', sessionsCompleted: [true, true, true, false] }).streakState;
    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(2);
    expect(state.totalDaysCompleted).toBe(3);
  });

  test('non-completed day (2 of 4) leaves streak unchanged', () => {
    const result = applyLog(emptyState, {
      date: '2026-08-09',
      sessionsCompleted: [true, true, false, false],
    });
    expect(result.dayCompleted).toBe(false);
    expect(result.sessionsCompletedCount).toBe(2);
    expect(result.streakChanged).toBe(false);
    expect(result.streakState.currentStreak).toBe(0);
    expect(result.streakState.lastCompletedDate).toBeNull();
    expect(result.streakState.totalDaysCompleted).toBe(0);
  });

  test('does not mutate the input streakState', () => {
    const state = { ...emptyState };
    applyLog(state, { date: '2026-08-09', sessionsCompleted: [true, true, true, false] });
    expect(state.currentStreak).toBe(0);
    expect(state.lastCompletedDate).toBeNull();
  });
});

describe('midnightReset', () => {
  test('resets to 0 when streak is active and yesterday was not completed', () => {
    expect(midnightReset({ currentStreak: 5, yesterdayCompleted: false })).toBe(0);
  });

  test('keeps streak when yesterday was completed', () => {
    expect(midnightReset({ currentStreak: 5, yesterdayCompleted: true })).toBe(5);
  });

  test('no-op when streak is already 0', () => {
    expect(midnightReset({ currentStreak: 0, yesterdayCompleted: false })).toBe(0);
  });

  test('keeps streak when no log exists for yesterday (treated as not completed => reset)', () => {
    expect(midnightReset({ currentStreak: 3, yesterdayCompleted: false })).toBe(0);
  });
});
