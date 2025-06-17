const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authenticate = require('../src/middleware/authenticate');
const {
  createQuiz,
  submitQuiz,
  getResults,
  getHint,
  retryQuiz
} = require('../src/controllers/quiz.controller');

// Quiz creation
router.post('/create', authenticate, createQuiz);

// Quiz submission with validation
router.post('/submit', authenticate, [
  body('quizId').isString().withMessage('Invalid quiz ID format'),
  body('answers').isArray().withMessage('Answers must be an array'),
  body('answers.*').not().isEmpty().withMessage('Answers cannot be empty')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  submitQuiz(req, res, next);
});

// Get quiz results with filters
router.get('/results', authenticate, getResults);

// Get all quizzes (basic version)
router.get('/all', authenticate, async (req, res) => {
  try {
    const { getDB } = require('../src/db/connect');
    const db = await getDB();
    const quizzes = await db.collection('quizzes').find({}, {
      projection: {
        _id: 1,
        title: 1,
        subject: 1,
        difficulty: 1,
        grade_level: 1
      }
    }).toArray();
    res.json(quizzes);
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get hint for question
router.post('/hint', authenticate, getHint);

// Retry quiz
router.post('/retry/:submissionId', authenticate, retryQuiz);

module.exports = router;