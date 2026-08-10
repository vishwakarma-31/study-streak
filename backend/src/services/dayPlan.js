const DAILY_BLOCKS = require('../config/dailyBlocks');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function daysSince(startDate, today) {
  const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((todayUTC - startUTC) / 86400000);
}

// Resolves which phase + week a given calendar date falls on, given the user's
// roadmap startDate. Clamps before the start (week 1) and past the roadmap end
// (last week). Pure — no DB access, unit-tested in tests/todayPlan.test.js.
function resolveWeek(phases, startDate, today) {
  const weekIndex = Math.floor(Math.max(daysSince(startDate, today), 0) / 7);
  let phase = null;
  let week = null;
  let cursor = weekIndex;
  for (const p of phases) {
    if (cursor < p.weeks.length) {
      phase = p;
      week = p.weeks[cursor];
      break;
    }
    cursor -= p.weeks.length;
  }
  if (!phase) {
    phase = phases[phases.length - 1];
    week = phase.weeks[phase.weeks.length - 1];
  }
  return { phase, week };
}

// The specific day's task for a weekday (from the week's `days` array), or
// null on weekends (fixed schedules apply). needsContent flags weekday weeks
// whose day content hasn't been authored yet.
function dayTaskFor(week, dayOfWeek) {
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { task: null, needsContent: false };
  }
  const day = (week.days || []).find((d) => d.dayOfWeek === DAY_NAMES[dayOfWeek]);
  if (!day) {
    return { task: null, needsContent: true };
  }
  return { task: day.task, needsContent: false };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr) {
  if (!DATE_RE.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// A YYYY-MM-DD string resolves to that local calendar date (midday so DST shifts
// never move it to another day); without a param it resolves to "now".
function resolveToday(dateParam) {
  if (dateParam) {
    const [year, month, day] = dateParam.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  return new Date();
}

// The 4 blocks for a day. Weekdays label the first three blocks with the day's
// task (topic as fallback) and the fourth with the phase's DSA focus on
// Mon/Wed/Fri vs Revision on Tue/Thu. Weekends use their fixed schedules.
function blocksForDay({ dayOfWeek, task = null, topic = null, dsaFocus = null }) {
  if (dayOfWeek === 0) return DAILY_BLOCKS.sunday;
  if (dayOfWeek === 6) return DAILY_BLOCKS.saturday;
  const blocks = DAILY_BLOCKS.weekday.map((b) => ({ ...b }));
  const label = task || topic;
  blocks[0].label = label;
  blocks[1].label = label;
  blocks[2].label = label;
  blocks[3].label = [1, 3, 5].includes(dayOfWeek)
    ? (dsaFocus ? `DSA — ${dsaFocus}` : 'DSA')
    : 'Revision';
  return blocks;
}

module.exports = { daysSince, resolveWeek, dayTaskFor, isValidDate, resolveToday, blocksForDay };
