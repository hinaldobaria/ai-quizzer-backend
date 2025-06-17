const { getDB } = require('../db/connect');

class User {
  static collectionName = 'users';

  static async create(userData) {
    const db = getDB();
    const result = await db.collection(this.collectionName).insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return result.insertedId;
  }

  static async findByUsername(username) {
    const db = getDB();
    return await db.collection(this.collectionName).findOne({ username });
  }
}

module.exports = User;