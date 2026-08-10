process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Roadmap = require('../src/models/Roadmap');
const DailyLog = require('../src/models/DailyLog');
const StreakState = require('../src/models/StreakState');
const Badge = require('../src/models/Badge');
const RankState = require('../src/models/RankState');

let mongoServer;

const userEmail = 'test@study.dev';
const userPassword = 'supersecret123';
let token;
let userId;

const seedPhases = [
  {
    phaseNumber: 1,
    title: 'Phase 1',
    weeks: [
      {
        weekNumber: 1,
        topic: 'Intro',
        resources: [{ name: 'MDN', platform: 'web' }],
        project: 'Project A',
        dsaFocus: 'arrays',
        days: [
          { dayOfWeek: 'Mon', task: 'Task Mon' },
          { dayOfWeek: 'Tue', task: 'Task Tue' },
          { dayOfWeek: 'Wed', task: 'Task Wed' },
          { dayOfWeek: 'Thu', task: 'Task Thu' },
          { dayOfWeek: 'Fri', task: 'Task Fri' },
        ],
      },
      {
        weekNumber: 2,
        topic: 'Basics',
        resources: [],
        project: 'Project B',
        dsaFocus: 'strings',
        days: [],
      },
    ],
  },
  {
    phaseNumber: 2,
    title: 'Phase 2',
    weeks: [
      {
        weekNumber: 1,
        topic: 'HTTP',
        resources: [],
        project: 'Project C',
        dsaFocus: 'trees',
      },
    ],
  },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function registerAndLogin() {
  await request(app).post('/auth/register').send({
    name: 'Test User',
    email: userEmail,
    password: userPassword,
  });
  const res = await request(app).post('/auth/login').send({
    email: userEmail,
    password: userPassword,
  });
  token = res.body.token;
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  userId = payload.userId;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await registerAndLogin();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Roadmap.deleteMany({}),
    DailyLog.deleteMany({}),
    StreakState.deleteMany({}),
    Badge.deleteMany({}),
    RankState.deleteMany({}),
  ]);
  await registerAndLogin();
  await Roadmap.create(seedPhases);
});

const authed = (req) => req.set('Authorization', `Bearer ${token}`);

describe('auth', () => {
  test('POST /auth/register returns a token', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Fresh User',
      email: 'fresh@study.dev',
      password: 'anothersecret1',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  test('POST /auth/login returns a token for valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: userEmail,
      password: userPassword,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });
});

describe('GET /roadmap', () => {
  test('returns all seeded phases in order', async () => {
    const res = await authed(request(app).get('/roadmap'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].phaseNumber).toBe(1);
    expect(res.body[1].phaseNumber).toBe(2);
    expect(res.body[0].weeks).toHaveLength(2);
    expect(res.body[0].title).toBe('Phase 1');
  });

  test('requires auth', async () => {
    const res = await request(app).get('/roadmap');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });
});

describe('GET /roadmap/today', () => {
  const MON = '2026-08-10'; // Monday
  const TUE = '2026-08-11'; // Tuesday
  const SAT = '2026-08-15'; // Saturday
  const SUN = '2026-08-16'; // Sunday

  function setStartDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return User.updateOne({ _id: userId }, { $set: { startDate: new Date(y, m - 1, d, 12, 0, 0) } });
  }

  test('returns current phase/week topic and 4 blocks', async () => {
    await setStartDate('2026-08-07'); // 3 days before Monday -> week 1
    const res = await authed(request(app).get(`/roadmap/today?date=${MON}`));
    expect(res.status).toBe(200);
    expect(res.body.phaseNumber).toBe(1);
    expect(res.body.week).toBe(1);
    expect(res.body.topic).toBe('Intro');
    expect(res.body.blocks).toHaveLength(4);
    expect(res.body.blocks[0].index).toBe(0);
    expect(res.body.resources).toEqual([{ name: 'MDN', platform: 'web' }]);
    expect(res.body.dayType).toBe('weekday');
  });

  test('advances into week 2 after 8 days', async () => {
    await setStartDate('2026-08-02'); // 8 days before Monday -> week 2
    const res = await authed(request(app).get(`/roadmap/today?date=${MON}`));
    expect(res.status).toBe(200);
    expect(res.body.week).toBe(2);
    expect(res.body.topic).toBe('Basics');
  });

  test('advances into phase 2 after 15 days', async () => {
    await setStartDate('2026-07-26'); // 15 days before Monday -> phase 2
    const res = await authed(request(app).get(`/roadmap/today?date=${MON}`));
    expect(res.status).toBe(200);
    expect(res.body.phaseNumber).toBe(2);
    expect(res.body.topic).toBe('HTTP');
  });

  test('resolves the specific day task on a weekday', async () => {
    await setStartDate('2026-08-07');
    const res = await authed(request(app).get(`/roadmap/today?date=${MON}`));
    expect(res.status).toBe(200);
    expect(res.body.dayType).toBe('weekday');
    expect(res.body.task).toBe('Task Mon');
    expect(res.body.needsContent).toBe(false);
  });

  test('labels blocks with the day task and the DSA/revision rule', async () => {
    await setStartDate('2026-08-07');
    const mon = await authed(request(app).get(`/roadmap/today?date=${MON}`));
    expect(mon.status).toBe(200);
    expect(mon.body.blocks.map((b) => b.label)).toEqual(['Task Mon', 'Task Mon', 'Task Mon', 'DSA — arrays']);
    expect(mon.body.blocks.map((b) => b.time)).toEqual(['4:15 am', '5:05 am', '8:00 pm', '8:50 pm']);
    const tue = await authed(request(app).get(`/roadmap/today?date=${TUE}`));
    expect(tue.body.blocks[3].label).toBe('Revision');
  });

  test('returns the distinct Saturday and Sunday block structures', async () => {
    await setStartDate('2026-08-12'); // 3 days before Saturday
    const sat = await authed(request(app).get(`/roadmap/today?date=${SAT}`));
    expect(sat.status).toBe(200);
    expect(sat.body.dayType).toBe('saturday');
    expect(sat.body.task).toBeNull();
    expect(sat.body.blocks).toEqual([
      { index: 0, label: 'Project AM', time: '4:15 am' },
      { index: 1, label: 'Project AM continued', time: '7:00 am' },
      { index: 2, label: 'Extended DSA', time: '9:30 am' },
      { index: 3, label: 'Project PM', time: '2:00 pm' },
    ]);
    await setStartDate('2026-08-13'); // 3 days before Sunday
    const sun = await authed(request(app).get(`/roadmap/today?date=${SUN}`));
    expect(sun.status).toBe(200);
    expect(sun.body.dayType).toBe('sunday');
    expect(sun.body.blocks).toEqual([
      { index: 0, label: 'Topic review', time: '4:15 am' },
      { index: 1, label: 'DSA review', time: '7:00 am' },
      { index: 2, label: 'Bug fixes', time: '2:00 pm' },
      { index: 3, label: 'Weekly planning', time: '8:00 pm' },
    ]);
  });

  test('flags needsContent for weekday weeks without day content', async () => {
    await setStartDate('2026-08-02'); // week 2, days: [], on a Monday
    const res = await authed(request(app).get(`/roadmap/today?date=${MON}`));
    expect(res.status).toBe(200);
    expect(res.body.dayType).toBe('weekday');
    expect(res.body.task).toBeNull();
    expect(res.body.needsContent).toBe(true);
  });

  test('rejects an invalid date', async () => {
    const res = await authed(request(app).get('/roadmap/today?date=not-a-date'));
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('GET /roadmap/today returns 401 without a token', async () => {
    const testRes = await request(app).get('/roadmap/today');
    expect(testRes.status).toBe(401);
  });
});

describe('GET /logs/:date', () => {
  function setStartDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return User.updateOne({ _id: userId }, { $set: { startDate: new Date(y, m - 1, d, 12, 0, 0) } });
  }

  test('returns null when no log exists', async () => {
    const res = await authed(request(app).get('/logs/2026-08-09'));
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  test('returns the per-block detail when a log exists (sunday)', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).get('/logs/2026-08-09'));
    expect(res.status).toBe(200);
    expect(res.body.date).toBe('2026-08-09');
    expect(res.body.dayType).toBe('sunday');
    expect(res.body.blocks.map((b) => b.index)).toEqual([1, 2, 3, 4]);
    expect(res.body.blocks.map((b) => b.completed)).toEqual([true, true, true, false]);
    expect(res.body.blocks.map((b) => b.label)).toEqual([
      'Topic review',
      'DSA review',
      'Bug fixes',
      'Weekly planning',
    ]);
    expect(res.body.blocks.map((b) => b.time)).toEqual(['4:15 am', '7:00 am', '2:00 pm', '8:00 pm']);
  });

  test('resolves the weekday task labels for a past date', async () => {
    await setStartDate('2026-08-07'); // 3 days before Monday -> week 1
    await authed(request(app).post('/logs/2026-08-10')).send({
      sessionsCompleted: [true, false, true, false],
    });
    const res = await authed(request(app).get('/logs/2026-08-10'));
    expect(res.status).toBe(200);
    expect(res.body.date).toBe('2026-08-10');
    expect(res.body.dayType).toBe('weekday');
    expect(res.body.blocks.map((b) => b.label)).toEqual(['Task Mon', 'Task Mon', 'Task Mon', 'DSA — arrays']);
    expect(res.body.blocks.map((b) => b.completed)).toEqual([true, false, true, false]);
    expect(res.body.blocks.map((b) => b.time)).toEqual(['4:15 am', '5:05 am', '8:00 pm', '8:50 pm']);
  });

  test('maps the saturday schedule for a saturday date', async () => {
    await setStartDate('2026-08-12'); // 3 days before Saturday
    await authed(request(app).post('/logs/2026-08-15')).send({
      sessionsCompleted: [true, true, true, true],
    });
    const res = await authed(request(app).get('/logs/2026-08-15'));
    expect(res.status).toBe(200);
    expect(res.body.dayType).toBe('saturday');
    expect(res.body.blocks.map((b) => b.label)).toEqual([
      'Project AM',
      'Project AM continued',
      'Extended DSA',
      'Project PM',
    ]);
    expect(res.body.blocks.every((b) => b.completed)).toBe(true);
  });

  test('includes note and dsaProblems in the detail', async () => {
    await DailyLog.create({
      userId,
      date: '2026-08-11',
      sessionsCompleted: [true, true, true, false],
      note: 'Felt good today',
      dsaProblems: [{ title: 'Two Sum', difficulty: 'Easy' }],
    });
    const res = await authed(request(app).get('/logs/2026-08-11'));
    expect(res.status).toBe(200);
    expect(res.body.dayType).toBe('weekday');
    expect(res.body.note).toBe('Felt good today');
    expect(res.body.dsaProblems).toEqual([{ title: 'Two Sum', difficulty: 'Easy' }]);
  });

  test('rejects a malformed date', async () => {
    const res = await authed(request(app).get('/logs/not-a-date'));
    expect(res.status).toBe(400);
  });
});

describe('GET /logs/history', () => {
  function localDateString(nDaysAgo) {
    const d = daysAgo(nDaysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  test('returns logs newest-first within the default window', async () => {
    await authed(request(app).post(`/logs/${localDateString(0)}`)).send({
      sessionsCompleted: [true, true, true, false],
    });
    await authed(request(app).post(`/logs/${localDateString(1)}`)).send({
      sessionsCompleted: [true, true, false, false],
    });
    await authed(request(app).post(`/logs/${localDateString(70)}`)).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).get('/logs/history'));
    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.date)).toEqual([localDateString(0), localDateString(1)]);
  });

  test('returns only contract fields on each entry', async () => {
    await authed(request(app).post(`/logs/${localDateString(0)}`)).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).get('/logs/history'));
    expect(res.status).toBe(200);
    expect(Object.keys(res.body[0]).sort()).toEqual([
      'date',
      'dayCompleted',
      'dsaProblems',
      'note',
      'sessionsCompletedCount',
    ]);
    expect(res.body[0]).toEqual({
      date: localDateString(0),
      dayCompleted: true,
      dsaProblems: [],
      note: '',
      sessionsCompletedCount: 3,
    });
  });

  test('respects from and to filters', async () => {
    await authed(request(app).post(`/logs/${localDateString(5)}`)).send({
      sessionsCompleted: [true, true, true, false],
    });
    await authed(request(app).post(`/logs/${localDateString(3)}`)).send({
      sessionsCompleted: [true, true, true, false],
    });
    await authed(request(app).post(`/logs/${localDateString(1)}`)).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).get(
      `/logs/history?from=${localDateString(4)}&to=${localDateString(2)}`
    ));
    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.date)).toEqual([localDateString(3)]);
  });

  test('returns an empty array when no logs exist in range', async () => {
    const res = await authed(request(app).get('/logs/history'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('rejects an invalid from', async () => {
    const res = await authed(request(app).get('/logs/history?from=not-a-date'));
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('rejects an invalid to', async () => {
    const res = await authed(request(app).get('/logs/history?to=2026-99-99'));
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('rejects from after to', async () => {
    const res = await authed(request(app).get(
      `/logs/history?from=${localDateString(0)}&to=${localDateString(5)}`
    ));
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('requires auth', async () => {
    const res = await request(app).get('/logs/history');
    expect(res.status).toBe(401);
  });
});

describe('POST /logs/:date', () => {
  test('marks day complete at 3 of 4 and reports streak 1', async () => {
    const res = await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    expect(res.status).toBe(200);
    expect(res.body.log.sessionsCompletedCount).toBe(3);
    expect(res.body.log.dayCompleted).toBe(true);
    expect(res.body.streak.currentStreak).toBe(1);
    expect(res.body.streak.longestStreak).toBe(1);
  });

  test('client-sent state is authoritative (unmarking a block works)', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, false, false, true],
    });
    const res = await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [false, true, false, false],
    });
    expect(res.status).toBe(200);
    expect(res.body.log.sessionsCompleted).toEqual([false, true, false, false]);
    expect(res.body.log.sessionsCompletedCount).toBe(1);
    expect(res.body.log.dayCompleted).toBe(false);
    expect(res.body.streak.currentStreak).toBe(0);
    expect(res.body.streak.totalDaysCompleted).toBe(0);
  });

  test('uncompleting a counted day rolls the streak back to 0', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, false, false],
    });
    expect(res.status).toBe(200);
    expect(res.body.log.dayCompleted).toBe(false);
    expect(res.body.streak.currentStreak).toBe(0);
    expect(res.body.streak.totalDaysCompleted).toBe(0);

    const streakRes = await authed(request(app).get('/streak'));
    expect(streakRes.body.currentStreak).toBe(0);
    expect(streakRes.body.history).toEqual([{ date: '2026-08-09', dayCompleted: false }]);
  });

  test('uncompleting the latest consecutive day decrements the streak', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    await authed(request(app).post('/logs/2026-08-10')).send({
      sessionsCompleted: [true, true, true, false],
    });
    expect((await authed(request(app).get('/streak'))).body.currentStreak).toBe(2);

    await authed(request(app).post('/logs/2026-08-10')).send({
      sessionsCompleted: [true, true, false, false],
    });
    const res = await authed(request(app).get('/streak'));
    expect(res.body.currentStreak).toBe(1);
    expect(res.body.totalDaysCompleted).toBe(1);
    expect(res.body.lastCompletedDate).toBe('2026-08-09');
    expect(res.body.history).toEqual([
      { date: '2026-08-09', dayCompleted: true },
      { date: '2026-08-10', dayCompleted: false },
    ]);
  });

  test('does not double-increment streak on same-day re-sync', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, true],
    });
    expect(res.body.streak.currentStreak).toBe(1);
    expect(res.body.streak.totalDaysCompleted).toBe(1);
  });

  test('increments streak across consecutive days', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).post('/logs/2026-08-10')).send({
      sessionsCompleted: [true, true, true, false],
    });
    expect(res.status).toBe(200);
    expect(res.body.streak.currentStreak).toBe(2);
  });

  test('awards +20 RP the first time a day is completed', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).get('/rank'));
    expect(res.body.totalRP).toBe(20);
    expect(res.body.currentTier).toBe('Iron');
    expect(res.body.currentSubTier).toBe('I');
    expect(res.body.rpIntoCurrentSubTier).toBe(20);
    expect(res.body.rpNeededForNextSubTier).toBe(80);
  });

  test('does not double-award RP on same-day re-sync', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, true],
    });
    const res = await authed(request(app).get('/rank'));
    expect(res.body.totalRP).toBe(20);
  });

  test('unmarking a day does not drop RP (rank never decreases)', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, false, false],
    });
    const res = await authed(request(app).get('/rank'));
    expect(res.body.totalRP).toBe(20);
    expect(res.body.streak).toBeUndefined();
  });

  test('15 completed days crosses into Bronze I', async () => {
    for (let d = 1; d <= 15; d += 1) {
      const date = `2026-08-${String(d).padStart(2, '0')}`;
      await authed(request(app).post(`/logs/${date}`)).send({
        sessionsCompleted: [true, true, true, false],
      });
    }
    const res = await authed(request(app).get('/rank'));
    expect(res.body.totalRP).toBe(300);
    expect(res.body.currentTier).toBe('Bronze');
    expect(res.body.currentSubTier).toBe('I');
    expect(res.body.rpIntoCurrentSubTier).toBe(0);
  });

  test('rejects invalid sessionsCompleted payloads', async () => {
    const res = await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true],
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /logs/:date/note', () => {
  test('adds a note to the day log', async () => {
    const res = await authed(request(app).patch('/logs/2026-08-09/note')).send({
      note: 'wrapped up recursion',
    });
    expect(res.status).toBe(200);
    expect(res.body.note).toBe('wrapped up recursion');
    expect(res.body.sessionsCompleted).toEqual([false, false, false, false]);
  });

  test('rejects a non-string note', async () => {
    const res = await authed(request(app).patch('/logs/2026-08-09/note')).send({ note: 42 });
    expect(res.status).toBe(400);
  });
});

describe('GET /streak', () => {
  test('returns streak state and history', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).get('/streak'));
    expect(res.status).toBe(200);
    expect(res.body.currentStreak).toBe(1);
    expect(res.body.longestStreak).toBe(1);
    expect(res.body.history).toEqual([{ date: '2026-08-09', dayCompleted: true }]);
  });

  test('requires auth', async () => {
    const res = await request(app).get('/streak');
    expect(res.status).toBe(401);
  });
});

describe('GET /badges', () => {
  test('returns earned badges', async () => {
    await Badge.create({
      userId,
      milestone: '7_day',
      achievedDate: new Date(),
    });
    const res = await authed(request(app).get('/badges'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].milestone).toBe('7_day');
  });

  test('returns empty array when no badges earned', async () => {
    const res = await authed(request(app).get('/badges'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /rank', () => {
  test('returns the Iron I zero state when no rank exists yet', async () => {
    const res = await authed(request(app).get('/rank'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalRP: 0,
      currentTier: 'Iron',
      currentSubTier: 'I',
      rpIntoCurrentSubTier: 0,
      rpNeededForNextSubTier: 100,
    });
  });

  test('requires auth', async () => {
    const res = await request(app).get('/rank');
    expect(res.status).toBe(401);
  });

  test('reports Radiant with no sub-tier at 2400 RP', async () => {
    await RankState.create({ userId, totalRP: 2450, currentTier: 'Radiant', currentSubTier: null, rpIntoCurrentSubTier: 50 });
    const res = await authed(request(app).get('/rank'));
    expect(res.body.currentTier).toBe('Radiant');
    expect(res.body.currentSubTier).toBeNull();
    expect(res.body.rpIntoCurrentSubTier).toBe(50);
    expect(res.body.rpNeededForNextSubTier).toBeNull();
  });
});
