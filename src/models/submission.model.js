const { getDB } = require('../db/connect');

class Submission {
  static collectionName = 'submissions';

  static async create(submissionData) {
    const db = getDB();
    const result = await db.collection(this.collectionName).insertOne({
      ...submissionData,
      submitted_at: new Date()
    });
    return result.insertedId;
  }

  static async findByUserAndQuiz(userId, quizId) {
    const db = getDB();
    const { ObjectId } = require('mongodb');
    return await db.collection(this.collectionName).findOne({
      user_id: new ObjectId(userId),
      quiz_id: new ObjectId(quizId)
    });
  }
}

module.exports = Submission;