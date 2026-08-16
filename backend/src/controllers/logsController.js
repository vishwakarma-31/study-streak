const DailyLog = require('../models/DailyLog');
const StreakState = require('../models/StreakState');
const CustomTask = require('../models/CustomTask');
const User = require('../models/User');
const Roadmap = require('../models/Roadmap');
const { countCompleted, isDayCompleted } = require('../services/streakCalculator');
const { buildStreakResponse } = require('./streakController');
const { resolveWeek, dayTaskFor, resolveToday, blocksForDay } = require('../services/dayPlan');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_WINDOW_DAYS = 60;

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDate(dateStr) {
  if (!DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function validateDateParam(req, res) {
  if (!isValidDate(req.params.date)) {
    res.status(400).json({ error: 'date must be a valid YYYY-MM-DD string' });
    return false;
  }
  return true;
}

async function getLog(req, res, next) {
  try {
    if (!validateDateParam(req, res)) return undefined;
    const { date } = req.params;
    const log = await DailyLog.findOne({ userId: req.userId, date }).lean();
    if (!log) return res.json(null);

    // Resolve which roadmap week/day this date falls on using the SAME pure
    // day-plan logic as /roadmap/today (Phase 14) — it works for any date, so a
    // past day's blocks show the real task labels she saw that day, not just
    // the completion booleans.
    const user = await User.findById(req.userId).select('startDate').lean();
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    const phases = await Roadmap.find({}).sort({ phaseNumber: 1 }).lean();
    if (phases.length === 0) {
      return res.status(404).json({ error: 'roadmap has not been seeded' });
    }

    const today = resolveToday(date);
    const { week } = resolveWeek(phases, user.startDate, today);
    const dayOfWeek = today.getDay();
    const { task } = dayTaskFor(week, dayOfWeek);
    const dayBlocks = blocksForDay({ dayOfWeek, task, topic: week.topic, dsaFocus: week.dsaFocus });

    const customTasks = await CustomTask.find({ userId: req.userId, date })
      .select('title completed -_id')
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      date,
      dayType: dayOfWeek === 0 ? 'sunday' : dayOfWeek === 6 ? 'saturday' : 'weekday',
      blocks: dayBlocks.map((b, i) => ({
        index: i + 1,
        label: b.label || 'Focus',
        time: b.time,
        completed: Boolean(log.sessionsCompleted[i]),
      })),
      note: log.note || '',
      dsaProblems: (log.dsaProblems || []).map(({ title, difficulty, link }) => ({ title, difficulty, link })),
      customTasks: customTasks.map((t) => ({ title: t.title, completed: t.completed })),
    });
  } catch (err) {
    return next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const { from, to } = req.query;
    if (from !== undefined && !isValidDate(from)) {
      return res.status(400).json({ error: 'from must be a valid YYYY-MM-DD string' });
    }
    if (to !== undefined && !isValidDate(to)) {
      return res.status(400).json({ error: 'to must be a valid YYYY-MM-DD string' });
    }

    const end = to || localToday();
    const endDate = new Date(`${end}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() - (DEFAULT_WINDOW_DAYS - 1));
    const start = from || formatDate(endDate);

    if (start > end) {
      return res.status(400).json({ error: 'from must not be after to' });
    }

    const logs = await DailyLog.find({ userId: req.userId, date: { $gte: start, $lte: end } })
      .select('date sessionsCompletedCount dayCompleted note dsaProblems -_id')
      .sort({ date: -1 })
      .lean();

    const tasks = await CustomTask.find({ userId: req.userId, date: { $gte: start, $lte: end } })
      .select('date title completed -_id')
      .sort({ createdAt: 1 })
      .lean();
    const tasksByDate = new Map();
    for (const task of tasks) {
      if (!tasksByDate.has(task.date)) tasksByDate.set(task.date, []);
      tasksByDate.get(task.date).push({ title: task.title, completed: task.completed });
    }

    return res.json(
      logs.map((log) => ({ ...log, customTasks: tasksByDate.get(log.date) || [] }))
    );
  } catch (err) {
    return next(err);
  }
}

async function upsertLog(req, res, next) {
  try {
    if (!validateDateParam(req, res)) return undefined;

    const incoming = req.body && req.body.sessionsCompleted;
    if (
      !Array.isArray(incoming) ||
      incoming.length !== 4 ||
      incoming.some((v) => typeof v !== 'boolean')
    ) {
      return res.status(400).json({ error: 'sessionsCompleted must be an array of 4 booleans' });
    }

    const userId = req.userId;
    const date = req.params.date;

    // The client's latest state is authoritative: it sends the full 4-block array
    // on every sync (single-device, latest-state-wins serialization), so a false
    // must be able to clear a stored true (unmarking a mistaken check-in).
    const sessionsCompleted = incoming;
    const sessionsCompletedCount = countCompleted(sessionsCompleted);
    const tasks = await CustomTask.find({ userId, date }).select('completed').lean();
    const dayCompleted = isDayCompleted(
      sessionsCompleted,
      tasks.map((t) => ({ completed: t.completed }))
    );

    const log = await DailyLog.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          sessionsCompleted,
          sessionsCompletedCount,
          dayCompleted,
          syncedAt: new Date(),
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    // Keep the StreakState doc alive with an existence-only upsert: it doubles
    // as the existence gate for GET /streak, but the authoritative confirmed
    // fields (confirmedStreak, longestStreak, totalDaysCompleted, lastCompletedDate)
    // and lastFinalizedDate are owned by catchUpFinalization. Writing them here
    // would clobber the calendar-aware snapshot (and reintroduce the Phase 21
    // trailing-gap bug into stored state), so use $setOnInsert — never $set them.
    await StreakState.updateOne(
      { userId },
      { $setOnInsert: { userId } },
      { upsert: true }
    );

    const streak = await buildStreakResponse(userId, date);
    return res.json({ log, streak });
  } catch (err) {
    return next(err);
  }
}

async function updateNote(req, res, next) {
  try {
    if (!validateDateParam(req, res)) return undefined;

    const { note } = req.body || {};
    if (typeof note !== 'string') {
      return res.status(400).json({ error: 'note must be a string' });
    }

    const log = await DailyLog.findOneAndUpdate(
      { userId: req.userId, date: req.params.date },
      { $set: { note } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json(log);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getLog, getHistory, upsertLog, updateNote };
