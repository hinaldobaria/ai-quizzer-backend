

const rateLimitMap = new Map();

const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

const rateLimiterMiddleware = (req, res, next) => {
  const key = req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  const timestamps = rateLimitMap.get(key);

  // Remove timestamps older than window
  while (timestamps.length && now - timestamps[0] > WINDOW_SIZE) {
    timestamps.shift();
  }

  if (timestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too many requests",
      message: "Please wait a few minutes before making more requests"
    });
  }

  timestamps.push(now);
  next();
};

module.exports = rateLimiterMiddleware;