const { resolveWeek, dayTaskFor } = require('../src/controllers/roadmapController');

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

const phases = [
  {
    phaseNumber: 1,
    title: 'Phase 1',
    weeks: [
      {
        weekNumber: 1,
        topic: 'W1',
        days: [
          { dayOfWeek: 'Mon', task: 'Mon task' },
          { dayOfWeek: 'Tue', task: 'Tue task' },
          { dayOfWeek: 'Wed', task: 'Wed task' },
          { dayOfWeek: 'Thu', task: 'Thu task' },
          { dayOfWeek: 'Fri', task: 'Fri task' },
        ],
      },
      { weekNumber: 2, topic: 'W2', days: [] },
    ],
  },
  {
    phaseNumber: 2,
    title: 'Phase 2',
    weeks: [{ weekNumber: 1, topic: 'P2W1' }],
  },
];

describe('dayTaskFor', () => {
  const daysWeek = phases[0].weeks[0];

  test.each([
    [1, 'Mon', 'Mon task'],
    [2, 'Tue', 'Tue task'],
    [3, 'Wed', 'Wed task'],
    [4, 'Thu', 'Thu task'],
    [5, 'Fri', 'Fri task'],
  ])('returns the specific task for weekday dayOfWeek %i', (dayOfWeek, name, expected) => {
    expect(dayTaskFor(daysWeek, dayOfWeek)).toEqual({ task: expected, needsContent: false });
  });

  test('flags needsContent when the week has an empty days array', () => {
    expect(dayTaskFor(phases[0].weeks[1], 1)).toEqual({ task: null, needsContent: true });
  });

  test('flags needsContent when the days key is missing entirely', () => {
    expect(dayTaskFor(phases[1].weeks[0], 3)).toEqual({ task: null, needsContent: true });
  });

  test('returns null and no needsContent on Saturday (fixed labels apply)', () => {
    expect(dayTaskFor(daysWeek, 6)).toEqual({ task: null, needsContent: false });
  });

  test('returns null and no needsContent on Sunday (fixed labels apply)', () => {
    expect(dayTaskFor(daysWeek, 0)).toEqual({ task: null, needsContent: false });
  });
});

describe('resolveWeek', () => {
  const today = dateNDaysAgo(0);

  test('resolves the first week when starting today', () => {
    const { phase, week } = resolveWeek(phases, today, today);
    expect(phase.phaseNumber).toBe(1);
    expect(week.weekNumber).toBe(1);
  });

  test('advances one week per 7 elapsed days', () => {
    const { week } = resolveWeek(phases, dateNDaysAgo(10), today);
    expect(week.weekNumber).toBe(2);
  });

  test('clamps past the last week of the roadmap', () => {
    const { phase, week } = resolveWeek(phases, dateNDaysAgo(1000), today);
    expect(phase.phaseNumber).toBe(2);
    expect(week.weekNumber).toBe(1);
  });

  test('clamps to the first week when startDate is in the future', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const { phase, week } = resolveWeek(phases, future, today);
    expect(phase.phaseNumber).toBe(1);
    expect(week.weekNumber).toBe(1);
  });
});
