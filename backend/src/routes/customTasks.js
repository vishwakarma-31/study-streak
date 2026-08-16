const express = require('express');
const auth = require('../middleware/auth');
const finalizeBeforeRequest = require('../middleware/finalizeBeforeRequest');
const {
  listCustomTasks,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/customTasksController');

const router = express.Router();

router.use(auth);
router.use(finalizeBeforeRequest);

router.get('/:date', listCustomTasks);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
