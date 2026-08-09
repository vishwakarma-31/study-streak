const cron = require('node-cron');
const DailyLog = require('../models/DailyLog');
const StreakState = require('../models/StreakState');
const { previousDate, midnightReset } = require('../services/streakCalculator');

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function runStreakResetCheck() {
  const yesterday = previousDate(todayString());
  const activeStates = await StreakState.find({ currentStreak: { $gt: 0 } })
    .select('_id currentStreak')
    .lean();

  let resets = 0;
  for (const state of activeStates) {
    const log = await DailyLog.findOne({ userId: state.userId, date: yesterday })
      .select('dayCompleted')
      .lean();
    const yesterdayCompleted = !!(log && log.dayCompleted);
    const newStreak = midnightReset({
      currentStreak: state.currentStreak,
      yesterdayCompleted,
    });
    if (newStreak !== state.currentStreak) {
      await StreakState.updateOne({ _id: state._id }, { $set: { currentStreak: 0 } });
      resets += 1;
    }
  }
  return resets;
}

function startMidnightCron() {
  cron.schedule('0 0 * * *', async () => {
    try {
      await runStreakResetCheck();
    } catch (err) {
      console.error('streak reset cron failed:', err);
    }
  });
}

module.exports = { startMidnightCron, runStreakResetCheck, todayString };
