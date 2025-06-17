const express = require('express');
const dotenv = require('dotenv');
const { connectDB, getDB } = require('./src/db/connect'); // Updated MongoDB connection
const rateLimiter = require('./src/middleware/rateLimit');
const errorHandler = require('./src/middleware/errorHandler');
dotenv.config();

const app = express();
app.use(express.json());

// Initialize database connection
connectDB().catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});

// Routes
const authRoutes = require('./routes/auth.route');
const quizRoutes = require('./routes/quiz.route');

// Middleware
app.use(rateLimiter);
app.use('/auth', authRoutes);
app.use('/quiz', quizRoutes);
app.use(errorHandler);

app.get('/health', async (req, res) => {
  try {
    const db = getDB();
    const mongoPing = await db.command({ ping: 1 });

    res.json({
      status: 'OK',
      db: mongoPing.ok ? 'connected' : 'disconnected'
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      error: err.message
    });
  }
});
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown (updated for MongoDB)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  const db = getDB();
  await db.client.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  const db = getDB();
  await db.client.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});