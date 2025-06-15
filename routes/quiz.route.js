const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authenticate = require('../src/middleware/authenticate');
const { createQuiz, getHint } = require('../src/controllers/quiz.controller');
const { sendEmail } = require('../src/utils/services/email.service');
const redisService = require('../src/utils/services/redis.service'); // Added this import
const db = require('../src/db/connect');

// Quiz creation
router.post('/create', authenticate, createQuiz);

// Quiz submission
router.post("/submit", authenticate, [
  body('quizId').isUUID().withMessage('Invalid quiz ID format'),
  body('answers').isArray().withMessage('Answers must be an array'),
  body('answers.*').not().isEmpty().withMessage('Answers cannot be empty')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { quizId, answers } = req.body;
  const userId = req.user.id;

  try {
    // Check if user already submitted this quiz recently
    const recentSubmission = await db.query(
      `SELECT id FROM submissions 
       WHERE user_id = $1 AND quiz_id = $2 
       AND submitted_at > NOW() - INTERVAL '5 minutes'`,
      [userId, quizId]
    );

    if (recentSubmission.rows.length > 0) {
      return res.status(429).json({ 
        error: "You've already submitted this quiz recently. Please wait before submitting again." 
      });
    }

    // Get quiz from database
    const quizRes = await db.query("SELECT * FROM quizzes WHERE id = $1", [quizId]);
    if (quizRes.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const quiz = quizRes.rows[0];
    const questions = quiz.questions;
    
    // Validate answer count
    if (answers.length !== questions.length) {
      return res.status(400).json({
        error: `Expected ${questions.length} answers, got ${answers.length}`
      });
    }

    // Calculate score
    let score = 0;
    const detailedResults = questions.map((question, index) => {
      const userAnswer = answers[index];
      let isCorrect = false;
      
      if (typeof question.answer === 'number') {
        isCorrect = userAnswer === question.answer;
      } else {
        const userAns = typeof userAnswer === 'string' ? 
          userAnswer.trim().toLowerCase() : 
          String(userAnswer).toLowerCase();
        isCorrect = userAns === question.answer.trim().toLowerCase();
      }
      
      if (isCorrect) score++;
      
      return {
        question: question.question,
        userAnswer,
        correctAnswer: question.answer,
        isCorrect,
        explanation: question.explanation || null
      };
    });

    // Store submission in PostgreSQL
    const submissionRes = await db.query(
      `INSERT INTO submissions (user_id, quiz_id, answers, score, submitted_at)
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [userId, quizId, JSON.stringify(answers), score]
    );

    // Cache submission in Redis
    try {
      const submissionCacheKey = `submission:${userId}:${submissionRes.rows[0].id}`;
      await redisService.setEx(
        submissionCacheKey, 
        86400, // 24h TTL
        JSON.stringify(submissionRes.rows[0])
      );
      console.log(`Cached submission under key: ${submissionCacheKey}`);
    } catch (cacheError) {
      console.error("Failed to cache submission:", cacheError);
    }

    // Send email notification
    try {
      const userRes = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
      if (userRes.rows[0]?.email) {
        await sendEmail(
          userRes.rows[0].email, 
          submissionRes.rows[0].id,
          quiz.title,
          score,
          questions.length,
          detailedResults.filter(r => !r.isCorrect)
        );
      }
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    res.status(200).json({
      message: "Quiz submitted successfully",
      score,
      total: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      detailedResults,
      submission: submissionRes.rows[0]
    });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ 
      error: "Server error during submission",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// Get quiz results
router.get('/results', authenticate, async (req, res) => {
  const userId = req.user.id;
  const { from, to, grade, subject, minScore, maxScore } = req.query;

  try {
    let query = 'SELECT s.*, q.title as quiz_title, q.grade_level, q.subject FROM submissions s JOIN quizzes q ON s.quiz_id = q.id WHERE s.user_id = $1';
    const params = [userId];
    let paramCount = 2;

    if (from) {
      query += ` AND s.submitted_at >= $${paramCount++}`;
      params.push(new Date(from));
    }
    if (to) {
      query += ` AND s.submitted_at <= $${paramCount++}`;
      params.push(new Date(to));
    }
    if (grade) {
      query += ` AND q.grade_level = $${paramCount++}`;
      params.push(grade);
    }
    if (subject) {
      query += ` AND q.subject = $${paramCount++}`;
      params.push(subject);
    }
    if (minScore) {
      query += ` AND s.score >= $${paramCount++}`;
      params.push(minScore);
    }
    if (maxScore) {
      query += ` AND s.score <= $${paramCount++}`;
      params.push(maxScore);
    }

    query += ' ORDER BY s.submitted_at DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all quizzes
router.get('/all', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT id, title, subject, difficulty, grade_level FROM quizzes');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get hint for question
router.post('/hint', authenticate, getHint);

// Retry quiz
router.post('/retry/:submissionId', authenticate, async (req, res) => {
  const { submissionId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Get original submission
    const subRes = await db.query(
      `SELECT * FROM submissions WHERE id = $1 AND user_id = $2`,
      [submissionId, userId]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({ 
        error: "Submission not found or not owned by user" 
      });
    }

    const submission = subRes.rows[0];
    
    // 2. Ensure answers is properly formatted JSON
    let answers;
    try {
      answers = typeof submission.answers === 'string' 
        ? JSON.parse(submission.answers) 
        : submission.answers;
    } catch (parseError) {
      console.error("Failed to parse answers:", submission.answers);
      return res.status(500).json({
        error: "Invalid answer format in original submission"
      });
    }

    // 3. Create new retry submission
    const newSubmission = await db.query(
      `INSERT INTO submissions (
        user_id, 
        quiz_id, 
        answers, 
        score, 
        submitted_at,
        is_retry,
        original_submission_id
       ) VALUES ($1, $2, $3, $4, NOW(), TRUE, $5) 
       RETURNING *`,
      [
        userId, 
        submission.quiz_id, 
        JSON.stringify(answers), // Explicitly stringify
        submission.score,
        submission.id
      ]
    );

    // 4. Get quiz details
    const quizRes = await db.query(
      "SELECT title FROM quizzes WHERE id = $1",
      [submission.quiz_id]
    );

    res.status(200).json({
      message: "Quiz retried successfully",
      submission: newSubmission.rows[0],
      original_submission: submission,
      quiz_title: quizRes.rows[0]?.title || 'Unknown Quiz'
    });

  } catch (err) {
    console.error("Error retrying quiz:", err);
    res.status(500).json({ 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
module.exports = router;