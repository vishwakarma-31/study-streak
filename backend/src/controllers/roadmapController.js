const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const DAILY_BLOCKS = require('../config/dailyBlocks');

function daysSince(startDate, today) {
  const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((todayUTC - startUTC) / 86400000);
}

function blocksForDay(dayOfWeek) {
  if (dayOfWeek === 0) return DAILY_BLOCKS.sunday;
  if (dayOfWeek === 6) return DAILY_BLOCKS.saturday;
  const blocks = DAILY_BLOCKS.weekday.map((b) => ({ ...b }));
  blocks[3].label = [1, 3, 5].includes(dayOfWeek) ? 'DSA' : 'Revision';
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
    const user = await User.findById(req.userId).select('startDate').lean();
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    const today = new Date();
    const phases = await Roadmap.find({}).sort({ phaseNumber: 1 }).lean();
    if (phases.length === 0) {
      return res.status(404).json({ error: 'roadmap has not been seeded' });
    }

    const weekIndex = Math.floor(Math.max(daysSince(user.startDate, today), 0) / 7);
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

    const dayOfWeek = today.getDay();
    return res.json({
      phaseNumber: phase.phaseNumber,
      phase: phase.title,
      week: week.weekNumber,
      topic: week.topic,
      blocks: blocksForDay(dayOfWeek),
      resources: week.resources || [],
      dayType: dayOfWeek === 0 ? 'sunday' : dayOfWeek === 6 ? 'saturday' : 'weekday',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getRoadmap, getToday };
