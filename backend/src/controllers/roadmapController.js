const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const DAILY_BLOCKS = require('../config/dailyBlocks');

function daysSince(startDate, today) {
  const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((todayUTC - startUTC) / 86400000);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function resolveToday(dateParam) {
  if (dateParam) {
    const [year, month, day] = dateParam.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  return new Date();
}

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

async function getRoadmap(req, res, next) {
  try {
    const phases = await Roadmap.find({}).sort({ phaseNumber: 1 }).lean();
    return res.json(
      phases.map((p) => ({ phaseNumber: p.phaseNumber, title: p.title, weeks: p.weeks }))
    );
  } catch (err) {
    return next(err);
  }
}

async function getToday(req, res, next) {
  try {
    const { date } = req.query;
    if (date !== undefined && !isValidDate(date)) {
      return res.status(400).json({ error: 'date must be a valid YYYY-MM-DD string' });
    }

    const user = await User.findById(req.userId).select('startDate').lean();
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    const today = resolveToday(date);
    const phases = await Roadmap.find({}).sort({ phaseNumber: 1 }).lean();
    if (phases.length === 0) {
      return res.status(404).json({ error: 'roadmap has not been seeded' });
    }

    const { phase, week } = resolveWeek(phases, user.startDate, today);
    const dayOfWeek = today.getDay();
    const { task, needsContent } = dayTaskFor(week, dayOfWeek);

    return res.json({
      phaseNumber: phase.phaseNumber,
      phase: phase.title,
      week: week.weekNumber,
      topic: week.topic,
      task,
      needsContent,
      blocks: blocksForDay({ dayOfWeek, task, topic: week.topic, dsaFocus: week.dsaFocus }),
      resources: week.resources || [],
      dayType: dayOfWeek === 0 ? 'sunday' : dayOfWeek === 6 ? 'saturday' : 'weekday',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getRoadmap, getToday, resolveWeek, dayTaskFor, resolveToday, blocksForDay };
