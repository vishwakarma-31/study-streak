const express = require('express');
const auth = require('../middleware/auth');
const finalizeBeforeRequest = require('../middleware/finalizeBeforeRequest');
const { getStreak } = require('../controllers/streakController');

const router = express.Router();

router.use(auth);
router.use(finalizeBeforeRequest);

router.get('/', getStreak);

module.exports = router;
