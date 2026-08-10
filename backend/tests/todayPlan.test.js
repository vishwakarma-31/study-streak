const { resolveWeek, dayTaskFor, resolveToday, blocksForDay } = require('../src/controllers/roadmapController');

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

describe('resolveToday', () => {
  test('parses a YYYY-MM-DD date into that local date', () => {
    const d = resolveToday('2026-08-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // August
    expect(d.getDate()).toBe(10);
    expect(d.getDay()).toBe(1); // Monday
  });

  test('returns the current date when no param is given', () => {
    const d = resolveToday();
    expect(d).toBeInstanceOf(Date);
  });

  test('maps Saturday and Sunday dates to the right weekday', () => {
    expect(resolveToday('2026-08-15').getDay()).toBe(6); // Saturday
    expect(resolveToday('2026-08-16').getDay()).toBe(0); // Sunday
  });
});

describe('blocksForDay', () => {
  const dayTask = { dayOfWeek: 'Mon', task: 'Semantic tags (header, nav, main)' };

  test('labels the first three weekday blocks with the day task', () => {
    const blocks = blocksForDay({ dayOfWeek: 1, task: dayTask.task, topic: 'W1', dsaFocus: 'arrays' });
    expect(blocks.map((b) => b.label)).toEqual(['Semantic tags (header, nav, main)', 'Semantic tags (header, nav, main)', 'Semantic tags (header, nav, main)', 'DSA — arrays']);
  });

  test('uses the week topic as the fallback label when the day has no task', () => {
    const blocks = blocksForDay({ dayOfWeek: 2, task: null, topic: 'W1', dsaFocus: 'arrays' });
    expect(blocks.slice(0, 3).map((b) => b.label)).toEqual(['W1', 'W1', 'W1']);
  });

  test('applies the DSA label on Mon/Wed/Fri and Revision on Tue/Thu', () => {
    expect(blocksForDay({ dayOfWeek: 1, task: 't', dsaFocus: 'arrays' })[3].label).toBe('DSA — arrays');
    expect(blocksForDay({ dayOfWeek: 3, task: 't', dsaFocus: 'arrays' })[3].label).toBe('DSA — arrays');
    expect(blocksForDay({ dayOfWeek: 5, task: 't', dsaFocus: 'arrays' })[3].label).toBe('DSA — arrays');
    expect(blocksForDay({ dayOfWeek: 2, task: 't', dsaFocus: 'arrays' })[3].label).toBe('Revision');
    expect(blocksForDay({ dayOfWeek: 4, task: 't', dsaFocus: 'arrays' })[3].label).toBe('Revision');
  });

  test('falls back to plain DSA when the phase has no dsaFocus', () => {
    expect(blocksForDay({ dayOfWeek: 1, task: 't', dsaFocus: null })[3].label).toBe('DSA');
  });

  test('keeps the fixed Saturday and Sunday schedules', () => {
    const sat = blocksForDay({ dayOfWeek: 6 });
    expect(sat.map((b) => b.label)).toEqual(['Project AM', 'Project AM continued', 'Extended DSA', 'Project PM']);
    const sun = blocksForDay({ dayOfWeek: 0 });
    expect(sun.map((b) => b.label)).toEqual(['Topic review', 'DSA review', 'Bug fixes', 'Weekly planning']);
  });

  test('keeps the fixed weekday times', () => {
    const blocks = blocksForDay({ dayOfWeek: 1, task: 't', dsaFocus: 'arrays' });
    expect(blocks.map((b) => b.time)).toEqual(['4:15 am', '5:05 am', '8:00 pm', '8:50 pm']);
  });
});
