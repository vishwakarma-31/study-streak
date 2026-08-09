const express = require('express');
const auth = require('../middleware/auth');
const { getLog, upsertLog, updateNote } = require('../controllers/logsController');

const router = express.Router();

router.use(auth);

router.get('/:date', getLog);
router.post('/:date', upsertLog);
router.patch('/:date/note', updateNote);

module.exports = router;
