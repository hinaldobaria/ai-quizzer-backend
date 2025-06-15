// src/controllers/quiz.controller.js
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connect');
const { generateQuiz, generateHint } = require('../utils/services/ai.service');
const redisService = require('../utils/services/redis.service');

const CACHE_TIMEOUT = 3600; // 1 hour

const getCacheKey = (type, ...args) => `${type}:${args.join(':')}`;

const createQuiz = async (req, res) => {
  try {
    const { grade_level, subject, difficulty, total_questions } = req.body;

    // Input validation
    if (!grade_level || !subject) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cacheKey = getCacheKey('quiz', grade_level, subject, difficulty);
    
    // Check cache with error handling
    const cachedQuiz = await redisService.get(cacheKey);
    if (cachedQuiz) {
      console.log(`Cache HIT for ${cacheKey}`);
      return res.json({ 
        message: 'Quiz retrieved from cache', 
        quiz: JSON.parse(cachedQuiz) 
      });
    }

    // Generate new quiz
    const aiQuiz = await generateQuiz(grade_level, subject, difficulty, total_questions || 5);
    const quiz = {
      id: uuidv4(),
      title: aiQuiz.title || `${subject} Quiz for Grade ${grade_level}`,
      grade_level,
      subject,
      difficulty,
      total_questions: aiQuiz.questions.length,
      max_score: aiQuiz.questions.length,
      questions: aiQuiz.questions
    };

    // DB Insert
    const result = await pool.query(
      `INSERT INTO quizzes 
       (id, title, grade_level, subject, difficulty, total_questions, max_score, questions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        quiz.id, quiz.title, quiz.grade_level, 
        quiz.subject, quiz.difficulty,
        quiz.total_questions, quiz.max_score, 
        JSON.stringify(quiz.questions)
      ]
    );

    // Cache with fallback
    await redisService.setEx(cacheKey, CACHE_TIMEOUT, JSON.stringify(quiz));
    console.log(`Cache SET for ${cacheKey}`);

    res.status(201).json({ message: 'Quiz created', quiz: result.rows[0] });
  } catch (err) {
    console.error('Error creating quiz:', err);
    res.status(500).json({ 
      error: 'Failed to create quiz',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
};

const getHint = async (req, res) => {
  try {
    const { question, quizId } = req.body;
    
    if (!question || !quizId) {
      return res.status(400).json({ error: 'Question and quizId are required' });
    }

    const cacheKey = `hint:${quizId}:${question.substring(0, 20)}`;
    const cachedHint = await redisService.get(cacheKey);
    
    if (cachedHint) {
      return res.status(200).json({ 
        message: 'Hint retrieved from cache',
        hint: cachedHint 
      });
    }

    const hint = await generateHint(question);
    
    await pool.query(
      `INSERT INTO hints (question_id, quiz_id, hint_text)
       VALUES ($1, $2, $3)`,
      [question.substring(0, 50), quizId, hint]
    );

    await redisService.setEx(cacheKey, CACHE_TIMEOUT, hint);
    res.status(200).json({ hint });
  } catch (err) {
    console.error('Error getting hint:', err);
    res.status(500).json({ error: 'Failed to generate hint' });
  }
};

module.exports = { 
  createQuiz,
  getHint
};