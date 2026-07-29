/**
 * Custom Rate Limiting Middleware for Satkar Medical System
 * Prevents brute-force password guessing attacks on auth endpoints and API spam.
 */

const rateLimitStore = new Map();

// Periodic cleanup every 10 minutes to prevent memory accumulation
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 15, message = 'Too many requests, please try again later.' }) => {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'client_ip';
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
      return next();
    }

    record.count++;

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `${message} Please retry after ${retryAfterSeconds} seconds.`,
        },
      });
    }

    next();
  };
};

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 login attempts per 15 minutes per IP
  message: 'Too many login attempts detected from your device.',
});

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // max 600 requests per 15 minutes per IP
  message: 'Too many requests sent to server.',
});

const scanRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 invoice scans per 15 minutes per IP
  message: 'Too many invoice scans requested. Please wait a few minutes before scanning more bills.',
});

module.exports = {
  authRateLimiter,
  apiRateLimiter,
  scanRateLimiter,
};
