const Badge = require('../models/Badge');

async function getBadges(req, res, next) {
  try {
    const badges = await Badge.find({ userId: req.userId }).sort({ achievedDate: 1 }).lean();
    return res.json(badges.map((b) => ({ milestone: b.milestone, achievedDate: b.achievedDate })));
  } catch (err) {
    return next(err);
  }
}

module.exports = { getBadges };
