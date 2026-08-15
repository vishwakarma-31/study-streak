require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const roadmapRoutes = require('./routes/roadmap');
const logsRoutes = require('./routes/logs');
const streakRoutes = require('./routes/streak');
const customTasksRoutes = require('./routes/customTasks');
const badgesRoutes = require('./routes/badges');
const rankRoutes = require('./routes/rank');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/roadmap', roadmapRoutes);
app.use('/logs', logsRoutes);
app.use('/streak', streakRoutes);
app.use('/custom-tasks', customTasksRoutes);
app.use('/badges', badgesRoutes);
app.use('/rank', rankRoutes);

app.use(errorHandler);

module.exports = app;
