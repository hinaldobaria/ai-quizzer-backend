// index.js
const express = require('express');
const dotenv = require('dotenv');
const redisService = require('./src/utils/services/redis.service');
const pool = require('./src/db/connect');
const rateLimiter = require('./src/middleware/rateLimit');
const errorHandler = require('./src/middleware/errorHandler');
dotenv.config();

const app = express();
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth.route');
const quizRoutes = require('./routes/quiz.route');
app.use(rateLimiter);
app.use('/auth', authRoutes);
app.use('/quiz', quizRoutes);

app.use(errorHandler);
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisPing = await redisService.client.ping();
    const dbPing = await pool.query('SELECT 1');
    
    res.json({
      status: 'OK',
      redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
      db: dbPing ? 'connected' : 'disconnected'
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      redis: redisService.client.isOpen ? 'connected' : 'disconnected',
      db: 'error',
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await redisService.quit();
  await pool.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await redisService.quit();
  await pool.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});