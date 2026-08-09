const express = require('express');
const auth = require('../middleware/auth');
const { getRank } = require('../controllers/rankController');

const router = express.Router();

router.use(auth);

router.get('/', getRank);

module.exports = router;
