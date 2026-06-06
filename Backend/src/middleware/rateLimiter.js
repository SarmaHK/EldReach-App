const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests created from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict Limiter for sensitive endpoints (like Registration/Verify)
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 requests per `window`
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many sensitive requests from this IP, please try again later',
  },
});

module.exports = {
  apiLimiter,
  strictLimiter,
};
