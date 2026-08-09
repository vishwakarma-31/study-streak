const RankState = require('../models/RankState');
const { tierForRP } = require('../services/rankCalculator');

async function getRank(req, res, next) {
  try {
    const rank = await RankState.findOne({ userId: req.userId }).lean();
    const totalRP = rank ? rank.totalRP : 0;
    const placement = tierForRP(totalRP);
    return res.json({
      totalRP,
      currentTier: placement.tier,
      currentSubTier: placement.subTier,
      rpIntoCurrentSubTier: placement.rpIntoCurrentSubTier,
      rpNeededForNextSubTier: placement.rpNeededForNextSubTier,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getRank };
