const { catchUpFinalization } = require('../cron/dailyFinalization');

// Runs idempotent catch-up finalization before the request proceeds, so streak
// and RP correctness never depend on the midnight cron having fired (Render free
// tier sleeps, gaps happen). Boundary-gated: a no-op once lastFinalizedDate is
// already "yesterday", so steady-state cost is two reads. Errors propagate to the
// central error handler; a finalization failure must not silently serve stale data.
module.exports = async function finalizeBeforeRequest(req, res, next) {
  try {
    if (req.userId) {
      await catchUpFinalization({ userId: req.userId });
    }
    next();
  } catch (err) {
    next(err);
  }
};
