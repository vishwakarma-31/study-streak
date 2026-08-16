const StreakState = require('../models/StreakState');
const DailyLog = require('../models/DailyLog');
const CustomTask = require('../models/CustomTask');
const { isDayCompleted, previousDate, confirmedStreakFor, computeStreakFromLogs } = require('../services/streakCalculator');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function localToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

// The authoritative streak view. The streak count is never trusted from client
// state and is recomputed from stored logs every read (Phase 19): everything up
// to yesterday is CONFIRMED, while today is a live PROVISIONAL value that only
// counts once the day finalizes. `date` is the client's local calendar date
// (same convention as the Phase 14 day-type fix), defaulting to server-local
// today. Shared by GET /streak and every write endpoint so all responses agree.
async function buildStreakResponse(userId, dateStr) {
  const logs = await DailyLog.find({ userId })
    .select('date dayCompleted sessionsCompleted')
    .sort({ date: 1 })
    .lean();

  // The confirmed streak is recomputed from the full calendar range through
  // yesterday (confirmedStreakFor walks every date, so a skipped day with no log
  // still resets it — the Phase 21 gap-day bug fix). Today is the live
  // provisional value on top.
  const confirmed = confirmedStreakFor(logs, previousDate(dateStr));
  const live = computeStreakFromLogs(logs);

  const todayLog = logs.find((l) => l.date === dateStr);
  const tasks = await CustomTask.find({ userId, date: dateStr }).select('completed').lean();
  const todayProvisional = isDayCompleted(
    todayLog ? todayLog.sessionsCompleted : [],
    tasks.map((t) => ({ completed: t.completed }))
  );

  return {
    currentStreak: confirmed.confirmedStreak + (todayProvisional ? 1 : 0),
    confirmedStreak: confirmed.confirmedStreak,
    todayProvisional,
    longestStreak: live.longestStreak,
    lastCompletedDate: live.lastCompletedDate,
    totalDaysCompleted: live.totalDaysCompleted,
    history: logs.map((l) => ({ date: l.date, dayCompleted: l.dayCompleted })),
  };
}

async function getStreak(req, res, next) {
  try {
    const streak = await StreakState.findOne({ userId: req.userId }).lean();
    if (!streak) {
      return res.status(404).json({ error: 'streak state not found' });
    }

    const date = req.query.date || localToday();
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'date must be a valid YYYY-MM-DD string' });
    }

    const streakData = await buildStreakResponse(req.userId, date);
    return res.json(streakData);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getStreak, buildStreakResponse };
