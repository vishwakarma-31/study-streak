const express = require('express');
const auth = require('../middleware/auth');
const { getRoadmap, getToday } = require('../controllers/roadmapController');

const router = express.Router();

router.get('/', auth, getRoadmap);
router.get('/today', auth, getToday);

module.exports = router;
