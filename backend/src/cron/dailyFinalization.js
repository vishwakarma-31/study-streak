const cron = require('node-cron');
const DailyLog = require('../models/DailyLog');
const StreakState = require('../models/StreakState');
const RankState = require('../models/RankState');
const { previousDate, nextDate, confirmedStreakFor } = require('../services/streakCalculator');
const { applyDayCompletion } = require('../services/rankCalculator');

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Catch-up finalization: snapshots the CONFIRMED streak (as of yesterday) into
// StreakState and awards RP for finalized completed days exactly once.
//
// Phase 21: correctness must never depend on this running at the exact midnight
// boundary. Render's free tier sleeps after ~15 min idle, so a scheduled job can
// silently miss a boundary; instead this function is idempotent and cheap, and is
// invoked from BOTH the scheduled cron AND opportunistically at the start of
// GET /streak, POST /logs/:date, and every custom-tasks route. A multi-day gap
// (server asleep, deploy, etc.) is caught up and reset the next time anyone
// touches the API.
//
// Idempotency is boundary-driven: lastFinalizedDate is only ever advanced to
// yesterday, and only dates in (lastFinalizedDate, yesterday] are walked for RP,
// so a date earns RP exactly once no matter how many times this is called.
//
// The streak snapshot is a FULL recompute from the earliest logged date
// (confirmedStreakFor walks every calendar date, resetting to 0 on any missed
// day — including days with no DailyLog at all), NOT a continuation of the
// stored value. That makes it self-healing: any confirmedStreak corrupted by the
// pre-Phase-21 cron (which used computeStreakFromLogs and therefore never reset
// on no-log gap days) is corrected on the next run.
async function catchUpFinalization({ nowDate, userId } = {}) {
  const today = nowDate || todayString();
  const yesterday = previousDate(today);

  let userRecords;
  if (userId) {
    userRecords = [{ userId }];
  } else {
    const [streakStates, rankStates] = await Promise.all([
      StreakState.find({}).select('userId').lean(),
      RankState.find({}).select('userId').lean(),
    ]);
    const ids = new Set();
    for (const s of streakStates) ids.add(String(s.userId));
    for (const r of rankStates) ids.add(String(r.userId));
    userRecords = [...ids].map((id) => ({ userId: id }));
  }

  let rpAwarded = 0;
  let finalizedUsers = 0;

  for (const { userId: uid } of userRecords) {
    const [streakState, rankState] = await Promise.all([
      StreakState.findOne({ userId: uid }).lean(),
      RankState.findOne({ userId: uid }).lean(),
    ]);

    const streakNeeded = !streakState || !streakState.lastFinalizedDate || streakState.lastFinalizedDate < yesterday;
    const rankNeeded = !rankState || !rankState.lastFinalizedDate || rankState.lastFinalizedDate < yesterday;
    if (!streakNeeded && !rankNeeded) continue;

    const logs = await DailyLog.find({ userId: uid })
      .select('date dayCompleted')
      .sort({ date: 1 })
      .lean();
    const byDate = new Map(logs.map((l) => [l.date, Boolean(l.dayCompleted)]));
    const isCompleted = (date) => byDate.get(date) || false;

    if (streakNeeded) {
      const confirmed = confirmedStreakFor(logs, yesterday);
      await StreakState.updateOne(
        { userId: uid },
        {
          $set: {
            confirmedStreak: confirmed.confirmedStreak,
            longestStreak: confirmed.longestStreak,
            totalDaysCompleted: confirmed.totalDaysCompleted,
            lastCompletedDate: confirmed.lastCompletedDate,
            lastFinalizedDate: yesterday,
          },
        },
        { upsert: true }
      );
    }

    if (rankNeeded) {
      if (!rankState || !rankState.lastFinalizedDate) {
        // Migration first run: legacy days already earned RP under the old
        // write-time scheme (or a pre-fix cron), so set the boundary WITHOUT
        // back-awarding — never double-award.
        await RankState.updateOne(
          { userId: uid },
          { $set: { lastFinalizedDate: yesterday } },
          { upsert: true }
        );
      } else {
        let current = rankState;
        let date = nextDate(rankState.lastFinalizedDate);
        while (date <= yesterday) {
          if (isCompleted(date)) {
            current = applyDayCompletion(current, { dayCompleted: true }).rankState;
            rpAwarded += 1;
          }
          date = nextDate(date);
        }
        const { totalRP, currentTier, currentSubTier, rpIntoCurrentSubTier } = current;
        await RankState.updateOne(
          { userId: uid },
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
    }

    finalizedUsers += 1;
  }

  return { finalizedUsers, rpAwarded };
}

function startMidnightCron() {
  cron.schedule('0 0 * * *', async () => {
    try {
      await catchUpFinalization();
    } catch (err) {
      console.error('midnight finalization cron failed:', err);
    }
  });
}

module.exports = { startMidnightCron, catchUpFinalization, todayString };
