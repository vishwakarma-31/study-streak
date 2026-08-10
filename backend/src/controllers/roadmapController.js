const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const {
  resolveWeek,
  dayTaskFor,
  isValidDate,
  resolveToday,
  blocksForDay,
} = require('../services/dayPlan');

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

module.exports = { getRoadmap, getToday };
