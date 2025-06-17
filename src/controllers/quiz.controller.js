const { getDB } = require('../db/connect');
const { generateQuiz, generateHint } = require('../utils/services/ai.service');

const { ObjectId } = require('mongodb');
const { sendEmail } = require('../utils/services/email.service');

// Create new quiz
const createQuiz = async (req, res) => {
  try {
    const db = await getDB();
    const { grade_level, subject, difficulty, total_questions } = req.body;

    const aiQuiz = await generateQuiz(grade_level, subject, difficulty, total_questions || 5);
    
    const quiz = {
      title: aiQuiz.title || `${subject} Quiz for Grade ${grade_level}`,
      grade_level,
      subject,
      difficulty,
      total_questions: aiQuiz.questions.length,
      max_score: aiQuiz.questions.length,
      questions: aiQuiz.questions,
      created_at: new Date()
    };

    const result = await db.collection('quizzes').insertOne(quiz);
    res.status(201).json({ 
      message: 'Quiz created', 
      quiz: { id: result.insertedId, ...quiz }
    });
  } catch (err) {
    console.error('Error creating quiz:', err);
    res.status(500).json({ 
      error: 'Failed to create quiz',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Submit quiz answers
const submitQuiz = async (req, res) => {
  const { quizId, answers } = req.body;
  const userId = req.user.id;
  const db = await getDB();

  try {
    // Check for recent submission
    const recentSubmission = await db.collection('submissions').findOne({
      user_id: new ObjectId(userId),
      quiz_id: new ObjectId(quizId),
      submitted_at: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (recentSubmission) {
      return res.status(429).json({ 
        error: "You've already submitted this quiz recently" 
      });
    }

    // Get quiz and calculate score
    const quiz = await db.collection('quizzes').findOne({ 
      _id: new ObjectId(quizId) 
    });

    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const { questions } = quiz;
    let score = 0;
    const detailedResults = questions.map((q, i) => {
      const isCorrect = checkAnswer(q.answer, answers[i]);
      if (isCorrect) score++;
      return {
        question: q.question,
        userAnswer: answers[i],
        correctAnswer: q.answer,
        isCorrect,
        explanation: q.explanation
      };
    });

    // Store submission
    const submission = {
      user_id: new ObjectId(userId),
      quiz_id: new ObjectId(quizId),
      answers,
      score,
      submitted_at: new Date(),
      is_retry: false
    };

    const result = await db.collection('submissions').insertOne(submission);

    // Send email notification
    try {
      // Get user email
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (user && user.email) {
        // Only send incorrect answers for suggestions
        const incorrectAnswers = detailedResults.filter(r => !r.isCorrect);
        await require('../utils/services/email.service')
          .sendQuizResults(user.email, result.insertedId, quiz.title, score, questions.length, incorrectAnswers);
      }
    } catch (emailErr) {
      console.error('Failed to send quiz result email:', emailErr);
    }
    
    res.status(200).json({
      message: "Quiz submitted successfully",
      score,
      total: questions.length,
      detailedResults
    });

  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ error: "Server error during submission" });
  }
};

// Helper function for answer checking
function checkAnswer(correctAnswer, userAnswer) {
  if (typeof correctAnswer === 'number') {
    return userAnswer === correctAnswer;
  }
  return String(userAnswer).trim().toLowerCase() === 
         String(correctAnswer).trim().toLowerCase();
}

// Get quiz results
const getResults = async (req, res) => {
  try {
    const db = await getDB();
    const userId = req.user.id;
    const { from, to, grade, subject, minScore, maxScore } = req.query;

    const pipeline = [
      { $match: { user_id: new ObjectId(userId) } },
      { $lookup: {
        from: 'quizzes',
        localField: 'quiz_id',
        foreignField: '_id',
        as: 'quiz'
      }},
      { $unwind: '$quiz' }
    ];

    // Add filters to pipeline...
    const results = await db.collection('submissions')
      .aggregate(pipeline)
      .toArray();

    res.json(results);
  } catch (err) {
    console.error('Results error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get hint for question
const getHint = async (req, res) => {
  try {
    const { question, quizId } = req.body;
    const hint = await generateHint(question);
    res.json({ hint });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate hint' });
  }
};

// Retry quiz
const retryQuiz = async (req, res) => {
  try {
    const db = await getDB();
    const { submissionId } = req.params;
    const userId = req.user.id;

    const original = await db.collection('submissions').findOne({
      _id: new ObjectId(submissionId),
      user_id: new ObjectId(userId)
    });

    if (!original) return res.status(404).json({ error: "Submission not found" });

    const newSubmission = {
      ...original,
      submitted_at: new Date(),
      is_retry: true,
      original_submission_id: original._id
    };
    delete newSubmission._id;

    const result = await db.collection('submissions').insertOne(newSubmission);
    res.json({
      message: "Quiz retried successfully",
      submissionId: result.insertedId
    });
  } catch (err) {
    console.error("Retry error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createQuiz,
  submitQuiz,
  getResults,
  getHint,
  retryQuiz
};