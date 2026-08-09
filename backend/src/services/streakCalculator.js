const COUNT_THRESHOLD = 3;

function countCompleted(sessionsCompleted = []) {
  return sessionsCompleted.filter(Boolean).length;
}

function isDayCompleted(sessionsCompleted = []) {
  return countCompleted(sessionsCompleted) >= COUNT_THRESHOLD;
}

function previousDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() - 1);
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

module.exports = { countCompleted, isDayCompleted, previousDate, applyLog, midnightReset };
