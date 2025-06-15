const redis = require('../utils/services/redis.service');
const { RateLimiterRedis } = require('rate-limiter-flexible');

// Configure rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redis.client,
  keyPrefix: 'rate_limit',
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
  blockDuration: 60 * 5 // block for 5 minutes if exceeded
});

const rateLimiterMiddleware = (req, res, next) => {
  const key = req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
  
  rateLimiter.consume(key)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({
        error: "Too many requests",
        message: "Please wait a few minutes before making more requests"
      });
    });
};

module.exports = rateLimiterMiddleware;