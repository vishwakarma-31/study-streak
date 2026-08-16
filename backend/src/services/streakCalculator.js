const COUNT_THRESHOLD = 3;

function countCompleted(sessionsCompleted = []) {
  return sessionsCompleted.filter(Boolean).length;
}

// A day counts as completed when at least 3 of the 4 fixed blocks are done AND
// any custom tasks the user added for that day are all completed. The custom
// task condition applies the "at least 3 of 4 blocks" threshold on top of the
// user-chosen tasks: adding a task leaves the day un-completed until that task
// is done, even if all 4 blocks are checked (visible, intentional behavior).
function isDayCompleted(sessionsCompleted = [], customTasks = []) {
  const blocksCompleted = countCompleted(sessionsCompleted) >= COUNT_THRESHOLD;
  const tasksCompleted = customTasks.length === 0 || customTasks.every((task) => task.completed);
  return blocksCompleted && tasksCompleted;
}

function previousDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function nextDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function applyLog(streakState, { date, sessionsCompleted }) {
  const sessionsCompletedCount = countCompleted(sessionsCompleted);
  const dayCompleted = isDayCompleted(sessionsCompleted);

  const currentStreak = streakState.currentStreak || 0;
  const longestStreak = streakState.longestStreak || 0;
  const lastCompletedDate = streakState.lastCompletedDate || null;
  const totalDaysCompleted = streakState.totalDaysCompleted || 0;

  let nextCurrentStreak = currentStreak;
  let nextLongestStreak = longestStreak;
  let nextLastCompletedDate = lastCompletedDate;
  let nextTotalDaysCompleted = totalDaysCompleted;
  let streakChanged = false;

  if (dayCompleted) {
    if (lastCompletedDate === date) {
      // same-day duplicate sync — already counted, no change
    } else if (lastCompletedDate === previousDate(date)) {
      nextCurrentStreak = currentStreak + 1;
      nextLastCompletedDate = date;
      nextTotalDaysCompleted = totalDaysCompleted + 1;
      nextLongestStreak = Math.max(longestStreak, nextCurrentStreak);
      streakChanged = true;
    } else {
      // gap detected — streak restarts fresh
      nextCurrentStreak = 1;
      nextLastCompletedDate = date;
      nextTotalDaysCompleted = totalDaysCompleted + 1;
      nextLongestStreak = Math.max(longestStreak, nextCurrentStreak);
      streakChanged = true;
    }
  }

  return {
    streakState: {
      currentStreak: nextCurrentStreak,
      longestStreak: nextLongestStreak,
      lastCompletedDate: nextLastCompletedDate,
      totalDaysCompleted: nextTotalDaysCompleted,
    },
    dayCompleted,
    sessionsCompletedCount,
    streakChanged,
  };
}

function midnightReset({ currentStreak, yesterdayCompleted }) {
  if (currentStreak > 0 && !yesterdayCompleted) {
    return 0;
  }
  return currentStreak;
}

// Walks EVERY calendar date in [startDate, endDate] (inclusive), in chronological
// order, continuing the streak state machine from `state`. `isCompleted(date)`
// answers whether that date counts as completed; a false answer (including a gap
// date with zero log data) resets confirmedStreak to 0. This is the calendar-
// aware walk that computeStreakFromLogs cannot express — it only sees existing
// documents, so a skipped day with no log at all is invisible to it.
function finalizeDateRange(state = {}, startDate, endDate, isCompleted) {
  const out = {
    confirmedStreak: state.confirmedStreak || 0,
    longestStreak: state.longestStreak || 0,
    totalDaysCompleted: state.totalDaysCompleted || 0,
    lastCompletedDate: state.lastCompletedDate || null,
  };
  if (!startDate || !endDate || startDate > endDate) return out;

  let date = startDate;
  while (date <= endDate) {
    if (isCompleted(date)) {
      out.confirmedStreak += 1;
      out.longestStreak = Math.max(out.longestStreak, out.confirmedStreak);
      out.totalDaysCompleted += 1;
      out.lastCompletedDate = date;
    } else {
      out.confirmedStreak = 0;
    }
    date = nextDate(date);
  }
  return out;
}

// The CONFIRMED streak as of `cutoffDate`: a full recompute from the earliest
// logged date through cutoffDate. Unlike computeStreakFromLogs (which only
// iterates existing documents), this walks every calendar date, so a missed day
// that has no DailyLog at all still resets the streak to 0 — the core Phase 21
// bug (complete day 1, skip day 2 with no log, complete day 3 must show 1, not 2).
function confirmedStreakFor(logs = [], cutoffDate) {
  const relevant = logs
    .filter((l) => l && l.date <= cutoffDate)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (relevant.length === 0) {
    return {
      confirmedStreak: 0,
      longestStreak: 0,
      totalDaysCompleted: 0,
      lastCompletedDate: null,
    };
  }

  const startDate = relevant[0].date;
  const byDate = new Map(relevant.map((l) => [l.date, Boolean(l.dayCompleted)]));
  return finalizeDateRange(
    { confirmedStreak: 0, longestStreak: 0, totalDaysCompleted: 0, lastCompletedDate: null },
    startDate,
    cutoffDate,
    (date) => byDate.get(date) || false
  );
}

// Recomputes the authoritative streak state from the full ordered set of daily
// logs ({ date, dayCompleted } ascending). Idempotent and handles un-completing a
// previously-counted day (something the incremental applyLog cannot do), so a
// mistaken check-in that is later unmarked rolls the streak back correctly.
function computeStreakFromLogs(logs = []) {
  const completed = logs
    .filter((log) => log && log.dayCompleted)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let currentStreak = 0;
  let longestStreak = 0;
  let totalDaysCompleted = 0;
  let lastCompletedDate = null;
  let prevCompletedDate = null;

  for (const log of completed) {
    totalDaysCompleted += 1;
    if (prevCompletedDate && log.date === nextDate(prevCompletedDate)) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    prevCompletedDate = log.date;
    lastCompletedDate = log.date;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return { currentStreak, longestStreak, lastCompletedDate, totalDaysCompleted };
}

module.exports = {
  countCompleted,
  isDayCompleted,
  previousDate,
  nextDate,
  applyLog,
  computeStreakFromLogs,
  confirmedStreakFor,
  finalizeDateRange,
  midnightReset,
};
