require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const roadmapRoutes = require('./routes/roadmap');
const logsRoutes = require('./routes/logs');
const streakRoutes = require('./routes/streak');
const badgesRoutes = require('./routes/badges');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/roadmap', roadmapRoutes);
app.use('/logs', logsRoutes);
app.use('/streak', streakRoutes);
app.use('/badges', badgesRoutes);

app.use(errorHandler);

module.exports = app;
