const { getDB } = require('../db/connect');

class Quiz {
  static collectionName = 'quizzes';

  static async create(quizData) {
    const db = getDB();
    const result = await db.collection(this.collectionName).insertOne({
      ...quizData,
      created_at: new Date()
    });
    return result.insertedId;
  }

  static async findById(id) {
    const db = getDB();
    const { ObjectId } = require('mongodb');
    return await db.collection(this.collectionName).findOne({ _id: new ObjectId(id) });
  }
}

module.exports = Quiz;