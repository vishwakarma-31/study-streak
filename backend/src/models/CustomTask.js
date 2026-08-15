const mongoose = require('mongoose');

const customTaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

customTaskSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('CustomTask', customTaskSchema);
