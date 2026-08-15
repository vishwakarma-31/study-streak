const cron = require('node-cron');
const DailyLog = require('../models/DailyLog');
const StreakState = require('../models/StreakState');
const RankState = require('../models/RankState');
const { previousDate, nextDate, computeStreakFromLogs } = require('../services/streakCalculator');
const { applyDayCompletion } = require('../services/rankCalculator');

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Runs once per day just after midnight and produces write-only snapshots; the
// read path (GET /streak, GET /rank) derives its answers independently, so the
// cron can never be the source of truth, only a record.
//   1. Streak: store confirmedStreak (streak as of yesterday) — today stays
//      provisional until it finalizes.
//   2. Rank: award DAY_COMPLETION_RP for every finalized completed day not yet
//      awarded. RP is cumulative and never decreases, so a day must earn exactly
//      once — the RankState.lastFinalizedDate boundary makes that safe.
//   3. Migration safety: a RankState with no lastFinalizedDate has never been
//      finalized. Old days already earned RP under the pre-cron write-time
//      scheme, so the first run sets the boundary WITHOUT back-awarding.
// `nowDate` exists for deterministic tests.
async function runMidnightFinalization(nowDate) {
  const today = nowDate || todayString();
  const yesterday = previousDate(today);

  const logs = await DailyLog.find({}).select('userId date dayCompleted').sort({ date: 1 }).lean();
  const byUser = new Map();
  for (const log of logs) {
    const key = String(log.userId);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(log);
  }

  let rpAwarded = 0;

  for (const [userId, userLogs] of byUser) {
    const confirmed = computeStreakFromLogs(
      userLogs.filter((l) => l.date <= yesterday)
    );
    await StreakState.updateOne(
      { userId },
      { $set: { confirmedStreak: confirmed.currentStreak, lastFinalizedDate: yesterday } },
      { upsert: true }
    );

    const rank = await RankState.findOne({ userId }).lean();
    if (!rank || !rank.lastFinalizedDate) {
      await RankState.updateOne(
        { userId },
        { $set: { lastFinalizedDate: yesterday } },
        { upsert: true }
      );
      continue;
    }

    const completedByDate = new Set(
      userLogs.filter((l) => l.dayCompleted).map((l) => l.date)
    );
    let current = rank;
    let cursor = nextDate(rank.lastFinalizedDate);
    while (cursor <= yesterday) {
      if (completedByDate.has(cursor)) {
        current = applyDayCompletion(current, { dayCompleted: true }).rankState;
        rpAwarded += 1;
      }
      cursor = nextDate(cursor);
    }
    const { totalRP, currentTier, currentSubTier, rpIntoCurrentSubTier } = current;
    await RankState.updateOne(
      { userId },
      {
        $set: {
          totalRP,
          currentTier,
          currentSubTier,
          rpIntoCurrentSubTier,
          lastFinalizedDate: yesterday,
        },
      },
      { upsert: true }
    );
  }

  return { finalizedUsers: byUser.size, rpAwarded };
}

function startMidnightCron() {
  cron.schedule('0 0 * * *', async () => {
    try {
      await runMidnightFinalization();
    } catch (err) {
      console.error('midnight finalization cron failed:', err);
    }
  });
}

module.exports = { startMidnightCron, runMidnightFinalization, todayString };
