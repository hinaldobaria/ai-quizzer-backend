// src/utils/services/redis.service.js
const { createClient } = require('redis');

class RedisService {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.log('Too many retries, giving up');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 5000); // Exponential backoff
        }
      }
    });

    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.client.on('connect', () => console.log('Redis connected'));
    this.client.on('ready', () => console.log('Redis ready'));
    this.client.on('reconnecting', () => console.log('Redis reconnecting'));
    
    this.connect();
  }

  async connect() {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
    } catch (err) {
      console.error('Redis connection failed:', err);
      throw err;
    }
  }

  async get(key) {
    try {
      if (!this.client.isOpen) await this.connect();
      return await this.client.get(key);
    } catch (err) {
      console.error('Redis GET error:', err);
      return null;
    }
  }

  async set(key, value) {
    try {
      if (!this.client.isOpen) await this.connect();
      return await this.client.set(key, value);
    } catch (err) {
      console.error('Redis SET error:', err);
      throw err;
    }
  }

  async setEx(key, seconds, value) {
    try {
      if (!this.client.isOpen) await this.connect();
      return await this.client.setEx(key, seconds, value);
    } catch (err) {
      console.error('Redis SETEX error:', err);
      throw err;
    }
  }

  async del(key) {
    try {
      if (!this.client.isOpen) await this.connect();
      return await this.client.del(key);
    } catch (err) {
      console.error('Redis DEL error:', err);
      throw err;
    }
  }

  async quit() {
    try {
      if (this.client.isOpen) {
        await this.client.quit();
      }
    } catch (err) {
      console.error('Redis quit error:', err);
    }
  }
}

module.exports = new RedisService();