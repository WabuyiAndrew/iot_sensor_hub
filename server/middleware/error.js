const colors = require("colors")

/**
 * Enhanced error handling middleware with better logging
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Enhanced logging with request context
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestId: req.requestId,
    user: req.user?.username || "anonymous",
    body: req.method === "POST" ? JSON.stringify(req.body).substring(0, 500) : undefined,
    query: Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : undefined,
  }

  console.error(`❌ Error: ${err.message}`.red)
  console.error(`📍 Request Info:`.yellow, JSON.stringify(requestInfo, null, 2))

  if (err.stack && process.env.NODE_ENV === "development") {
    console.error(`📚 Stack: ${err.stack}`.red)
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found with id: ${err.value}`
    error = { message, statusCode: 404 }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    const message = `Duplicate field value for ${field}: ${err.keyValue[field]}`
    error = { message, statusCode: 400 }
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ")
    error = { message, statusCode: 400 }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token"
    error = { message, statusCode: 401 }
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired"
    error = { message, statusCode: 401 }
  }

  // Rate limit errors
  if (err.status === 429) {
    const message = "Too many requests, please try again later"
    error = { message, statusCode: 429 }
  }

  // MongoDB aggregation errors
  if (err.name === "MongoServerError") {
    console.error(`🔍 MongoDB Error Details:`.yellow, {
      code: err.code,
      codeName: err.codeName,
      errmsg: err.errmsg,
    })

    if (err.code === 16550) {
      const message = "Invalid aggregation pipeline operation"
      error = { message, statusCode: 400 }
    } else if (err.code === 2) {
      const message = "Invalid field name in query"
      error = { message, statusCode: 400 }
    }
  }

  // Network/Connection errors
  if (err.name === "MongoNetworkError" || err.name === "MongoTimeoutError") {
    const message = "Database connection error"
    error = { message, statusCode: 503 }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      originalError: err.name,
    }),
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  })
}

module.exports = errorHandler
