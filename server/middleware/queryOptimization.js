const mongoose = require("mongoose")

/**
 * Query optimization middleware for MongoDB operations
 */
const queryOptimizationMiddleware = (options = {}) => {
  const { enableProfiling = false, slowQueryThreshold = 100, logSlowQueries = true } = options

  return (req, res, next) => {
    const startTime = Date.now()

    // Override res.json to capture response time
    const originalJson = res.json
    res.json = function (data) {
      const duration = Date.now() - startTime

      if (logSlowQueries && duration > slowQueryThreshold) {
        console.log(`🐌 Slow query detected: ${req.method} ${req.path} took ${duration}ms`)
      }

      return originalJson.call(this, data)
    }

    next()
  }
}

/**
 * Add query hints for better performance
 */
const addQueryHints = (req, res, next) => {
  // Add query hints to request context
  req.queryHints = {
    useIndex: (indexName) => ({ hint: indexName }),
    limit: (count) => ({ limit: count }),
    sort: (sortObj) => ({ sort: sortObj }),
    lean: () => ({ lean: true }),
  }

  next()
}

/**
 * Simple query cache middleware
 */
const queryCacheMiddleware = (options = {}) => {
  const { ttl = 300, enabled = true } = options
  const cache = new Map()

  if (!enabled) {
    return (req, res, next) => next()
  }

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next()
    }

    const cacheKey = `${req.method}:${req.originalUrl}`
    const cached = cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < ttl * 1000) {
      return res.json(cached.data)
    }

    // Override res.json to cache response
    const originalJson = res.json
    res.json = function (data) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        })

        // Clean up old cache entries
        if (cache.size > 1000) {
          const oldestKey = cache.keys().next().value
          cache.delete(oldestKey)
        }
      }

      return originalJson.call(this, data)
    }

    next()
  }
}

module.exports = {
  queryOptimizationMiddleware,
  addQueryHints,
  queryCacheMiddleware,
}
