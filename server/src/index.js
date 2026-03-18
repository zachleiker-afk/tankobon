const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const mangaRoutes = require('./routes/manga');
const userRoutes = require('./routes/user');
const authMiddleware = require('./middleware/auth');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/manga', mangaRoutes);
app.use('/api/user', authMiddleware, userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tankobon API is running' });
});

app.listen(PORT, () => {
  console.log(`Tankobon server running on port ${PORT}`);

  // Start the daily manga sync scheduler
  startScheduler();
});
