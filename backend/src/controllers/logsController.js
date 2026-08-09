const DailyLog = require('../models/DailyLog');
const StreakState = require('../models/StreakState');
const { countCompleted, isDayCompleted, applyLog } = require('../services/streakCalculator');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

async function findStreakState(userId) {
  let streak = await StreakState.findOne({ userId });
  if (!streak) {
    streak = await StreakState.create({ userId });
  }
  return streak;
}

async function getLog(req, res, next) {
  try {
    if (!validateDateParam(req, res)) return undefined;
    const log = await DailyLog.findOne({ userId: req.userId, date: req.params.date }).lean();
    return res.json(log || null);
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

    const existing = await DailyLog.findOne({ userId, date });
    const base = existing ? existing.sessionsCompleted : [false, false, false, false];
    const merged = base.map((v, i) => v || incoming[i]);

    const sessionsCompletedCount = countCompleted(merged);
    const dayCompleted = isDayCompleted(merged);

    const log = await DailyLog.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          sessionsCompleted: merged,
          sessionsCompletedCount,
          dayCompleted,
          syncedAt: new Date(),
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    const streak = await findStreakState(userId);
    const result = applyLog(streak, { date, sessionsCompleted: merged });
    if (result.streakChanged) {
      await StreakState.updateOne({ _id: streak._id }, { $set: result.streakState });
    }

    return res.json({ log, streak: result.streakState });
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

module.exports = { getLog, upsertLog, updateNote };
