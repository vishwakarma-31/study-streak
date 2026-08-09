const mongoose = require('mongoose');

const MILESTONES = [
  '7_day',
  '30_day',
  '100_day',
  'phase_1_complete',
  'phase_2_complete',
  'phase_3_complete',
  'phase_4_complete',
  'phase_5_complete',
  'phase_6_complete',
  'phase_7_complete',
  'phase_8_complete',
];

const badgeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    milestone: { type: String, enum: MILESTONES, required: true },
    achievedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

badgeSchema.index({ userId: 1, milestone: 1 }, { unique: true });

module.exports = mongoose.model('Badge', badgeSchema);
