const mongoose = require('mongoose');

const rankStateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalRP: { type: Number, default: 0 },
    currentTier: { type: String, default: 'Iron' },
    currentSubTier: { type: String, default: null },
    rpIntoCurrentSubTier: { type: Number, default: 0 },
    lastFinalizedDate: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RankState', rankStateSchema);
