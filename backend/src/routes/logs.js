const express = require('express');
const auth = require('../middleware/auth');
const finalizeBeforeRequest = require('../middleware/finalizeBeforeRequest');
const { getLog, getHistory, upsertLog, updateNote } = require('../controllers/logsController');

const router = express.Router();

router.use(auth);
router.use(finalizeBeforeRequest);

router.get('/history', getHistory);
router.get('/:date', getLog);
router.post('/:date', upsertLog);
router.patch('/:date/note', updateNote);

module.exports = router;
