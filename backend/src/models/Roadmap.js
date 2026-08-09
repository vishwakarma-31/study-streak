const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema(
  {
    phaseNumber: { type: Number, required: true, unique: true, min: 1, max: 8 },
    title: { type: String, required: true },
    weeks: [
      {
        _id: false,
        weekNumber: Number,
        topic: String,
        resources: [{ _id: false, name: String, platform: String }],
        project: String,
        dsaFocus: String,
        days: [
          {
            _id: false,
            dayOfWeek: String,
            task: String,
            resourceRef: String,
          },
        ],
        needsContent: Boolean,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Roadmap', roadmapSchema);
