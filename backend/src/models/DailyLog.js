const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    sessionsCompleted: { type: [Boolean], default: [false, false, false, false] },
    sessionsCompletedCount: { type: Number, default: 0 },
    dayCompleted: { type: Boolean, default: false },
    note: { type: String, default: '' },
    dsaProblems: [{ title: String, difficulty: String, link: String }],
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyLog', dailyLogSchema);
