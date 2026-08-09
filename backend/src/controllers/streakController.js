const StreakState = require('../models/StreakState');
const DailyLog = require('../models/DailyLog');

async function getStreak(req, res, next) {
  try {
    const streak = await StreakState.findOne({ userId: req.userId }).lean();
    if (!streak) {
      return res.status(404).json({ error: 'streak state not found' });
    }

    const logs = await DailyLog.find({ userId: req.userId })
      .select('date dayCompleted')
      .sort({ date: 1 })
      .lean();

    return res.json({
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedDate: streak.lastCompletedDate,
      totalDaysCompleted: streak.totalDaysCompleted,
      history: logs.map((l) => ({ date: l.date, dayCompleted: l.dayCompleted })),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getStreak };
