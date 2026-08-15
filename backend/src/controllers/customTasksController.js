const mongoose = require('mongoose');
const CustomTask = require('../models/CustomTask');
const DailyLog = require('../models/DailyLog');
const { countCompleted, isDayCompleted } = require('../services/streakCalculator');
const { buildStreakResponse } = require('./streakController');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function localToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isValidDate(dateStr) {
  if (!DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function toTaskPayload(task) {
  return { id: task._id, title: task.title, completed: task.completed, date: task.date };
}

// Re-derives a day's completion from the raw sources (4 blocks + that day's
// custom tasks) and persists it on the DailyLog. Called by every custom-task
// write so dayCompleted is never stale on a day with tasks.
async function recomputeDay(userId, date) {
  const [log, tasks] = await Promise.all([
    DailyLog.findOne({ userId, date }).lean(),
    CustomTask.find({ userId, date }).select('completed').lean(),
  ]);
  if (!log) return;

  const sessionsCompletedCount = countCompleted(log.sessionsCompleted);
  const dayCompleted = isDayCompleted(
    log.sessionsCompleted,
    tasks.map((t) => ({ completed: t.completed }))
  );
  await DailyLog.updateOne(
    { userId, date },
    {
      $set: { sessionsCompletedCount, dayCompleted, syncedAt: new Date() },
    }
  );
}

async function listCustomTasks(req, res, next) {
  try {
    const { date } = req.params;
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'date must be a valid YYYY-MM-DD string' });
    }
    const tasks = await CustomTask.find({ userId: req.userId, date })
      .sort({ createdAt: 1 })
      .lean();
    return res.json(tasks.map(toTaskPayload));
  } catch (err) {
    return next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const { date, title } = req.body || {};
    const today = localToday();
    if (date !== today) {
      return res.status(400).json({ error: 'custom tasks can only be added for today' });
    }
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (cleanTitle.length > 120) {
      return res.status(400).json({ error: 'title must be 120 characters or fewer' });
    }

    const task = await CustomTask.create({ userId: req.userId, date, title: cleanTitle, completed: false });
    await recomputeDay(req.userId, date);
    return res.status(201).json(toTaskPayload(task));
  } catch (err) {
    return next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'id must be a valid task id' });
    }
    const { completed } = req.body || {};
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be a boolean' });
    }

    const task = await CustomTask.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { $set: { completed } },
      { returnDocument: 'after' }
    );
    if (!task) {
      return res.status(404).json({ error: 'custom task not found' });
    }

    // The task belongs to whatever date it was created for (possibly "yesterday"
    // if it was added just before midnight) — recompute that date, not today.
    await recomputeDay(req.userId, task.date);
    return res.json(toTaskPayload(task));
  } catch (err) {
    return next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'id must be a valid task id' });
    }

    const task = await CustomTask.findOneAndDelete({ _id: id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'custom task not found' });
    }

    await recomputeDay(req.userId, task.date);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listCustomTasks, createTask, updateTask, deleteTask, recomputeDay };
