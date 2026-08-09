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
      },
      {
        weekNumber: 2,
        topic: 'Basics',
        resources: [],
        project: 'Project B',
        dsaFocus: 'strings',
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
  test('returns current phase/week topic and 4 blocks', async () => {
    await User.updateOne({ _id: userId }, { $set: { startDate: daysAgo(3) } });
    const res = await authed(request(app).get('/roadmap/today'));
    expect(res.status).toBe(200);
    expect(res.body.phaseNumber).toBe(1);
    expect(res.body.week).toBe(1);
    expect(res.body.topic).toBe('Intro');
    expect(res.body.blocks).toHaveLength(4);
    expect(res.body.blocks[0].index).toBe(0);
    expect(res.body.resources).toEqual([{ name: 'MDN', platform: 'web' }]);
    expect(['weekday', 'saturday', 'sunday']).toContain(res.body.dayType);
  });

  test('advances into week 2 after 10 days', async () => {
    await User.updateOne({ _id: userId }, { $set: { startDate: daysAgo(10) } });
    const res = await authed(request(app).get('/roadmap/today'));
    expect(res.status).toBe(200);
    expect(res.body.week).toBe(2);
    expect(res.body.topic).toBe('Basics');
  });

  test('advances into phase 2 after 20 days', async () => {
    await User.updateOne({ _id: userId }, { $set: { startDate: daysAgo(20) } });
    const res = await authed(request(app).get('/roadmap/today'));
    expect(res.status).toBe(200);
    expect(res.body.phaseNumber).toBe(2);
    expect(res.body.topic).toBe('HTTP');
  });
});

describe('GET /logs/:date', () => {
  test('returns null when no log exists', async () => {
    const res = await authed(request(app).get('/logs/2026-08-09'));
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  test('returns the log when one exists', async () => {
    await authed(request(app).post('/logs/2026-08-09')).send({
      sessionsCompleted: [true, true, true, false],
    });
    const res = await authed(request(app).get('/logs/2026-08-09'));
    expect(res.status).toBe(200);
    expect(res.body.sessionsCompletedCount).toBe(3);
    expect(res.body.dayCompleted).toBe(true);
  });

  test('rejects a malformed date', async () => {
    const res = await authed(request(app).get('/logs/not-a-date'));
    expect(res.status).toBe(400);
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
