const mongoose = require('mongoose');

const streakStateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null },
    totalDaysCompleted: { type: Number, default: 0 },
    confirmedStreak: { type: Number, default: 0 },
    lastFinalizedDate: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StreakState', streakStateSchema);
