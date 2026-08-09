const DailyLog = require('../models/DailyLog');
const StreakState = require('../models/StreakState');
const RankState = require('../models/RankState');
const { countCompleted, isDayCompleted, computeStreakFromLogs } = require('../services/streakCalculator');
const { applyDayCompletion } = require('../services/rankCalculator');

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
    const log = await DailyLog.findOne({ userId: req.userId, date: req.params.date }).lean();
    return res.json(log || null);
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

    return res.json(logs);
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

    const existingLog = await DailyLog.findOne({ userId, date }).lean();
    const wasCompleted = Boolean(existingLog && existingLog.dayCompleted);

    // The client's latest state is authoritative: it sends the full 4-block array
    // on every sync (single-device, latest-state-wins serialization), so a false
    // must be able to clear a stored true (unmarking a mistaken check-in).
    const sessionsCompleted = incoming;
    const sessionsCompletedCount = countCompleted(sessionsCompleted);
    const dayCompleted = isDayCompleted(sessionsCompleted);

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

    const logs = await DailyLog.find({ userId }).select('date dayCompleted').sort({ date: 1 }).lean();
    const streakState = computeStreakFromLogs(logs);
    await StreakState.updateOne({ userId }, { $set: streakState }, { upsert: true });

    // Rank is cumulative and never decreases: award RP only when a day newly
    // becomes completed (false → true). Re-syncs and unmarking a day change nothing.
    if (dayCompleted && !wasCompleted) {
      const rank = await RankState.findOne({ userId }).lean();
      const { rankState } = applyDayCompletion(rank || {}, { dayCompleted: true });
      await RankState.updateOne({ userId }, { $set: rankState }, { upsert: true });
    }

    return res.json({ log, streak: streakState });
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
