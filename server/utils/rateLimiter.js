const rateLimit = require("express-rate-limit")

// Create different rate limiters for different endpoints
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development
    skip: (req) => process.env.NODE_ENV === "development",
  })
}

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limit
  general: createRateLimiter(15 * 60 * 1000, 1000, "Too many requests, please try again later"), // 1000 requests per 15 minutes

  // Authentication endpoints
  auth: createRateLimiter(15 * 60 * 1000, 50, "Too many authentication attempts, please try again later"), // 50 requests per 15 minutes

  // Sensor data ingestion (more lenient)
  sensorData: createRateLimiter(1 * 60 * 1000, 500, "Too many sensor data requests, please slow down"), // 500 requests per minute

  // User profile and settings
  userProfile: createRateLimiter(5 * 60 * 1000, 100, "Too many profile requests, please try again later"), // 100 requests per 5 minutes

  // Device management
  deviceManagement: createRateLimiter(5 * 60 * 1000, 200, "Too many device requests, please try again later"), // 200 requests per 5 minutes

  // Health checks and monitoring
  health: createRateLimiter(1 * 60 * 1000, 60, "Too many health check requests"), // 60 requests per minute

  // Blog and content
  blog: createRateLimiter(10 * 60 * 1000, 100, "Too many blog requests, please try again later"), // 100 requests per 10 minutes
}

module.exports = rateLimiters
