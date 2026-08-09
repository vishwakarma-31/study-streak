const express = require('express');
const auth = require('../middleware/auth');
const { getBadges } = require('../controllers/badgesController');

const router = express.Router();

router.use(auth);

router.get('/', getBadges);

module.exports = router;
