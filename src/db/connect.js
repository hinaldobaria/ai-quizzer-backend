const { MongoClient } = require('mongodb');
require('dotenv').config();

let client;
let db;

const connectDB = async () => {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('ai_quizzer');
    console.log('MongoDB connected successfully');
  }
  return db;
};

const getDB = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};

module.exports = { connectDB, getDB };