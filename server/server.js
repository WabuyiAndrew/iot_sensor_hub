require("dotenv").config()
const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const morgan = require("morgan")
const helmet = require("helmet")
const compression = require("compression")
const rateLimit = require("express-rate-limit")
require("colors")
const mongoose = require("mongoose")
const WebSocket = require("ws")
const jwt = require("jsonwebtoken")
const winston = require("winston")

// Import existing middleware and routes
const { queryOptimizationMiddleware, addQueryHints, queryCacheMiddleware } = require("./middleware/queryOptimization")
const errorHandler = require("./middleware/error")
const userRoutes = require("./routes/userRoutes")
const deviceRoutes = require("./routes/deviceRoutes")
const tankTypeRoutes = require("./routes/tankTypeRoutes")
const sensorRoutes = require("./routes/sensorRoutes")
const blogRoutes = require("./routes/blogRoutes")
const volumeHistoryRoutes = require("./routes/volumeHistoryRoutes")
const alertRoutes = require("./routes/alertRoutes")
const alertThresholdRoutes = require("./routes/alertThresholdRoutes")
const proxyRoutes = require("./routes/proxyRoutes")

// Import models
const User = require("./models/user")
const SensorData = require("./models/SensorData")
const Device = require("./models/Device")
const TankType = require("./models/tankType")
const TankVolumeHistory = require("./models/TankVolumeHistory")
const Alert = require("./models/Alert")
const Analytics = require("./models/Analytics")

// Import controllers and services
const { processTankVolumeReading } = require("./services/volumeProcessor")

// Import scheduler functions with better error handling
let schedulerFunctions = null
try {
  schedulerFunctions = require('./tasks/ingestionScheduler')
  console.log('✅ [Scheduler] Successfully imported scheduler functions'.green)
} catch (scheduleError) {
  console.warn('⚠️ [Scheduler] Scheduler functions not available:', scheduleError.message.yellow)
  // Create safe fallback functions
  schedulerFunctions = {
    startIngestionScheduler: () => console.warn('⚠️ [Scheduler] Not available'.yellow),
    stopIngestionScheduler: () => console.warn('⚠️ [Scheduler] Not available'.yellow),
    getSchedulerStatus: () => ({ isRunning: false, error: 'Scheduler not available' }),
    processRawSensorData: async () => console.warn('⚠️ [Scheduler] Not available'.yellow),
    cleanupOldData: async () => console.warn('⚠️ [Scheduler] Not available'.yellow),
    generateDailySummary: async () => console.warn('⚠️ [Scheduler] Not available'.yellow)
  }
}

// Enhanced logging setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      )
    })
  ]
});

// Global state tracking with better management
let isServerReady = false
let isDatabaseConnected = false
let isSchedulerInitialized = false
let changeStreamsActive = false
let isConnecting = false
let connectionAttempts = 0
let lastConnectionAttempt = 0
let optimizationCompleted = false

const app = express()

// Increase EventEmitter limits to prevent memory leak warnings
require('events').EventEmitter.defaultMaxListeners = 20
mongoose.connection.setMaxListeners(20)

// Optimized rate limiting with connection throttling
const createRateLimit = (windowMs, max, message) => {
  if (process.env.NODE_ENV === "development") {
    return (req, res, next) => next()
  }
  return rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
      })
    },
  })
}

// Apply rate limits
app.use("/api/sensor/raw-data", createRateLimit(60 * 1000, 500, "Too many sensor data submissions"))
app.use("/api/users/login", createRateLimit(15 * 60 * 1000, 3, "Too many login attempts"))
app.use("/api/users/profile", createRateLimit(60 * 1000, 10, "Too many profile requests"))
app.use("/api/proxy", createRateLimit(60 * 1000, 100, "Too many proxy requests"))
app.use("/api/", createRateLimit(15 * 60 * 1000, 500, "Too many API requests"))

// Enhanced mongoose configuration
mongoose.set("strictQuery", false)
mongoose.set("strictPopulate", false)

const mongooseOptions = {
  maxPoolSize: 5, // Reduced pool size
  minPoolSize: 1,
  serverSelectionTimeoutMS: 10000, // Reduced timeout
  socketTimeoutMS: 30000,
  connectTimeoutMS: 10000,
  bufferCommands: false,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
  readPreference: "primaryPreferred",
  maxConnecting: 2, // Reduced concurrent connections
  heartbeatFrequencyMS: 30000, // Increased heartbeat interval
}

// Add query timeout plugin
mongoose.plugin((schema) => {
  schema.pre(/^find/, function () {
    this.maxTimeMS(8000)
  })
  schema.pre("save", function () {
    this.maxTimeMS(8000)
  })
  schema.pre("updateOne", function () {
    this.maxTimeMS(8000)
  })
  schema.pre("updateMany", function () {
    this.maxTimeMS(8000)
  })
})

// Robust database optimization function
const optimizeDatabase = async () => {
  if (optimizationCompleted) {
    console.log("ℹ️ [Database] Optimization already completed, skipping...".cyan)
    return
  }

  try {
    console.log("🔧 [Database] Starting optimization...".blue)
    
    // Wait for stable connection
    if (mongoose.connection.readyState !== 1) {
      console.log("⚠️ [Database] Waiting for stable connection...".yellow)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout during optimization'))
        }, 15000)
        
        const checkConnection = () => {
          if (mongoose.connection.readyState === 1) {
            clearTimeout(timeout)
            resolve()
          } else {
            setTimeout(checkConnection, 1000)
          }
        }
        checkConnection()
      })
    }

    const db = mongoose.connection.db

    // Helper function to create index safely
    const createIndexSafely = async (collection, indexSpec, options = {}) => {
      try {
        await db.collection(collection).createIndex(indexSpec, { ...options, background: true })
        console.log(`✅ [Index] Created on ${collection}:`, JSON.stringify(indexSpec))
      } catch (error) {
        if (error.code === 86 || error.code === 11000) {
          console.log(`ℹ️ [Index] Already exists on ${collection}:`, JSON.stringify(indexSpec))
        } else {
          console.warn(`⚠️ [Index] Failed on ${collection}: ${error.message}`)
        }
      }
    }

    // Essential indexes only
    const criticalIndexes = [
      ['users', { emailid: 1 }, { unique: true }],
      ['devices', { serialNumber: 1 }, { unique: true }],
      ['sensordatas', { deviceId: 1, timestamp: -1 }],
      ['sensordatas', { timestamp: -1 }],
      ['alerts', { status: 1, timestamp: -1 }],
    ]

    // Create critical indexes first
    for (const [collection, indexSpec, options] of criticalIndexes) {
      await createIndexSafely(collection, indexSpec, options)
    }

    optimizationCompleted = true
    console.log("✅ [Database] Critical indexes created successfully".green)
  } catch (error) {
    logger.error('Database optimization failed', { error: error.message })
    console.error("❌ [Database] Optimization failed:", error.message)
    // Don't throw - let the app continue without optimization
  }
}

// Robust connection with proper state management
const connectWithRetry = async () => {
  // Prevent multiple concurrent connection attempts
  if (isConnecting) {
    console.log("🔄 [Database] Connection already in progress, skipping...".yellow)
    return
  }

  // Rate limit connection attempts
  const now = Date.now()
  if (now - lastConnectionAttempt < 5000) {
    console.log("🔄 [Database] Rate limiting connection attempts...".yellow)
    return
  }

  lastConnectionAttempt = now
  isConnecting = true
  connectionAttempts++

  const maxRetries = 3 // Reduced max retries
  
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI
    
    if (!mongoURI) {
      throw new Error('MongoDB URI not provided in environment variables')
    }

    console.log(`🔄 [Database] Connection attempt ${connectionAttempts}`.blue)
    console.log(`🔗 [Database] Connecting to MongoDB...`.blue)

    // Close existing connection cleanly
    if (mongoose.connection.readyState !== 0) {
      console.log("🔄 [Database] Closing existing connection...".yellow)
      await mongoose.connection.close()
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for cleanup
    }

    await mongoose.connect(mongoURI, mongooseOptions)
    
    // Wait for connection to be fully established
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection verification timeout')), 5000)
      
      if (mongoose.connection.readyState === 1) {
        clearTimeout(timeout)
        resolve()
      } else {
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout)
          resolve()
        })
      }
    })

    isDatabaseConnected = true
    isConnecting = false
    connectionAttempts = 0
    
    console.log("🚀 [Database] Connected successfully!".green.bold)

    // Register models
    console.log("🔧 [Database] Registering models...".blue)
    const models = [
      require("./models/user"),
      require("./models/Device"), 
      require("./models/tankType"),
      require("./models/SensorData"),
      require("./models/TankVolumeHistory"),
      require("./models/Blog"),
      require("./models/Alert"),
      require("./models/Analytics")
    ]
    
    console.log("✅ [Database] Models registered successfully".green)

    // Optimize database after stable connection
    setTimeout(async () => {
      if (isDatabaseConnected && mongoose.connection.readyState === 1) {
        await optimizeDatabase()
        
        // Setup change streams after optimization
        setTimeout(() => {
          if (isDatabaseConnected) {
            setupChangeStreams()
          }
        }, 2000)

        // Initialize scheduler after everything is ready
        setTimeout(() => {
          if (isDatabaseConnected && schedulerFunctions) {
            initializeScheduler()
          }
        }, 5000)
      }
    }, 3000)

  } catch (err) {
    isDatabaseConnected = false
    isConnecting = false
    
    logger.error('MongoDB connection failed', { error: err.message, attempt: connectionAttempts })
    console.error(`❌ [Database] Connection failed: ${err.message}`.red)

    // Enhanced error handling with specific suggestions
    if (err.message.includes("ECONNREFUSED") || err.message.includes("querySrv ECONNREFUSED")) {
      console.log("💡 [Database] Network connection issue detected".yellow)
      console.log("   - Check your internet connection".yellow)
      console.log("   - Verify MongoDB Atlas cluster is running".yellow)
      console.log("   - Check if your IP is whitelisted in Atlas".yellow)
    } else if (err.message.includes("authentication failed")) {
      console.log("💡 [Database] Authentication failed - check credentials".yellow)
    } else if (err.message.includes("getaddrinfo") || err.message.includes("ENOTFOUND")) {
      console.log("💡 [Database] DNS resolution failed - check MongoDB URI".yellow)
    }

    if (connectionAttempts < maxRetries) {
      const retryDelay = Math.min(10000 * connectionAttempts, 30000) // Progressive backoff
      console.log(`🔄 [Database] Retrying in ${retryDelay / 1000}s... (${connectionAttempts}/${maxRetries})`.yellow)
      setTimeout(() => {
        if (!isDatabaseConnected) {
          connectWithRetry()
        }
      }, retryDelay)
    } else {
      console.error("❌ [Database] Max retries reached. Server will continue without database.".red)
      console.log("💡 [Database] The server will remain available for health checks".yellow)
      connectionAttempts = 0 // Reset for future attempts
    }
  }
}

// Initialize scheduler with proper error handling
const initializeScheduler = () => {
  if (isSchedulerInitialized) {
    console.log('ℹ️ [Scheduler] Already initialized'.cyan)
    return
  }

  try {
    if (schedulerFunctions && typeof schedulerFunctions.startIngestionScheduler === 'function') {
      console.log('🚀 [Scheduler] Starting...'.blue)
      schedulerFunctions.startIngestionScheduler()
      isSchedulerInitialized = true
      console.log('✅ [Scheduler] Started successfully'.green)
    } else {
      console.warn('⚠️ [Scheduler] Functions not available'.yellow)
    }
  } catch (schedulerError) {
    logger.error('Failed to initialize scheduler', { error: schedulerError.message })
    console.error('❌ [Scheduler] Failed to start:', schedulerError.message)
  }
}

// Enhanced mongoose event handlers with better state management
mongoose.connection.on("connected", () => {
  if (!isDatabaseConnected) {
    isDatabaseConnected = true
    logger.info('Mongoose connected to MongoDB')
    console.log("🟢 [Database] Connected".green)
  }
})

mongoose.connection.on("error", (err) => {
  logger.error('Mongoose connection error', { error: err.message })
  console.error("❌ [Database] Error:", err.message.red)
  // Don't change connection state on error - let reconnection logic handle it
})

mongoose.connection.on("disconnected", () => {
  if (isDatabaseConnected) {
    isDatabaseConnected = false
    changeStreamsActive = false
    logger.warn('Mongoose disconnected from MongoDB')
    console.log("🔴 [Database] Disconnected".red)
    
    // Only attempt reconnection if not already connecting
    if (!isConnecting) {
      console.log("🔄 [Database] Scheduling reconnection...".yellow)
      setTimeout(() => {
        if (!isDatabaseConnected && !isConnecting) {
          connectWithRetry()
        }
      }, 10000) // Longer delay before reconnection
    }
  }
})

mongoose.connection.on("reconnected", () => {
  if (!isDatabaseConnected) {
    isDatabaseConnected = true
    logger.info('Mongoose reconnected to MongoDB')
    console.log("🟢 [Database] Reconnected".green)
    
    // Restart change streams after reconnection
    setTimeout(() => {
      if (isDatabaseConnected && !changeStreamsActive) {
        setupChangeStreams()
      }
    }, 5000)
  }
})

// Start initial connection
connectWithRetry()

// Optimized middleware stack
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
)

app.use(compression({ level: 6, threshold: 1024 }))

app.use(
  express.json({
    limit: "5mb",
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf)
      } catch (e) {
        logger.warn('Invalid JSON payload received', { ip: req.ip })
        res.status(400).json({ error: "Invalid JSON payload" })
        throw new Error("Invalid JSON")
      }
    },
  }),
)

app.use(cookieParser())

// Enhanced Morgan logging
app.use(
  morgan(
    (tokens, req, res) => {
      const requestId = req.headers["x-request-id"] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      req.requestId = requestId
      
      const logData = {
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: tokens.status(req, res),
        contentLength: tokens.res(req, res, 'content-length'),
        responseTime: tokens['response-time'](req, res),
        ip: req.ip,
        requestId
      }
      
      logger.info('HTTP Request', logData)
      return [
        `[${requestId}]`,
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, "content-length"),
        "-",
        tokens["response-time"](req, res),
        "ms",
        `(${req.ip})`,
      ].join(" ")
    },
    {
      skip: (req, res) => process.env.NODE_ENV === "test" || req.url === "/health",
    },
  ),
)

// Query optimization middleware
app.use(
  queryOptimizationMiddleware({
    enableProfiling: process.env.NODE_ENV === "development",
    slowQueryThreshold: 1000,
    logSlowQueries: true,
  }),
)
app.use(addQueryHints)
app.use(
  queryCacheMiddleware({
    ttl: 300,
    enabled: process.env.NODE_ENV === "production",
  }),
)

// Optimized CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const allowedOrigins = [
        process.env.CLIENT_URL || "https://2tume.com",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
      ].filter(Boolean)
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") return allowed === origin
        if (allowed instanceof RegExp) return allowed.test(origin)
        return false
      })
      if (isAllowed) {
        callback(null, true)
      } else {
        logger.warn('CORS blocked origin', { origin })
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id", "x-device-id"],
    exposedHeaders: ["x-total-count", "x-page-count", "x-request-id"],
  }),
)

// Request ID and timing middleware
app.use((req, res, next) => {
  if (!req.requestId) {
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  res.setHeader("x-request-id", req.requestId)
  req.startTime = Date.now()
  next()
})

// Enhanced health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState
    const dbStatus = {
      0: "disconnected",
      1: "connected", 
      2: "connecting",
      3: "disconnecting",
    }[dbState]

    let dbStats = null
    let wsStats = null
    let schedulerStatus = null

    if (dbState === 1 && isDatabaseConnected) {
      try {
        await mongoose.connection.db.admin().ping()
        dbStats = await mongoose.connection.db.stats()
        wsStats = {
          totalConnections: wss ? wss.clients.size : 0,
          authenticatedConnections: authenticatedClients.size,
        }
        if (schedulerFunctions && typeof schedulerFunctions.getSchedulerStatus === 'function') {
          schedulerStatus = schedulerFunctions.getSchedulerStatus()
        }
      } catch (err) {
        logger.warn('Could not get health stats', { error: err.message })
      }
    }

    const healthInfo = {
      status: dbState === 1 && isDatabaseConnected ? "OK" : "DEGRADED",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: dbStatus,
        connected: isDatabaseConnected,
        connectionAttempts,
        optimizationCompleted,
        ...(dbStats && {
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          indexSize: dbStats.indexSize,
        }),
      },
      websocket: wsStats,
      scheduler: schedulerStatus || { isRunning: isSchedulerInitialized, available: !!schedulerFunctions },
      changeStreams: { active: changeStreamsActive },
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "2.0.0",
    }

    res.status(200).json(healthInfo) // Always return 200 for health checks
  } catch (error) {
    logger.error('Health check failed', { error: error.message })
    res.status(200).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    })
  }
})

// API routes
app.use("/api/users", userRoutes)
app.use("/api/devices", deviceRoutes)
app.use("/api/tank-types", tankTypeRoutes)
app.use("/api/sensor", sensorRoutes)
app.use("/api/blog", blogRoutes)
app.use("/api/volume-history", volumeHistoryRoutes)
app.use("/api/alerts", alertRoutes)
app.use('/api/thresholds', alertThresholdRoutes)
app.use("/api/proxy", proxyRoutes)

// Scheduler management endpoints
app.get("/api/scheduler/status", (req, res) => {
  try {
    const status = schedulerFunctions && typeof schedulerFunctions.getSchedulerStatus === 'function' 
      ? schedulerFunctions.getSchedulerStatus() 
      : { isRunning: false, error: 'Scheduler not available' }
    
    res.json({
      success: true,
      scheduler: {
        ...status,
        initialized: isSchedulerInitialized,
        available: !!schedulerFunctions
      }
    })
  } catch (error) {
    logger.error('Scheduler status check failed', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/scheduler/start", async (req, res) => {
  try {
    if (!schedulerFunctions || typeof schedulerFunctions.startIngestionScheduler !== 'function') {
      return res.status(400).json({ success: false, error: 'Scheduler not available' })
    }
    
    if (isSchedulerInitialized) {
      return res.status(400).json({ success: false, error: 'Scheduler already running' })
    }
    
    schedulerFunctions.startIngestionScheduler()
    isSchedulerInitialized = true
    
    logger.info('Scheduler started via API')
    res.json({ success: true, message: 'Scheduler started successfully' })
  } catch (error) {
    logger.error('Failed to start scheduler via API', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/scheduler/stop", async (req, res) => {
  try {
    if (!schedulerFunctions || typeof schedulerFunctions.stopIngestionScheduler !== 'function') {
      return res.status(400).json({ success: false, error: 'Scheduler not available' })
    }
    
    schedulerFunctions.stopIngestionScheduler()
    isSchedulerInitialized = false
    
    logger.info('Scheduler stopped via API')
    res.json({ success: true, message: 'Scheduler stopped successfully' })
  } catch (error) {
    logger.error('Failed to stop scheduler via API', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

// Manual data processing endpoints
app.post("/api/scheduler/process-data", async (req, res) => {
  try {
    if (!schedulerFunctions || typeof schedulerFunctions.processRawSensorData !== 'function') {
      return res.status(400).json({ success: false, error: 'Data processing not available' })
    }
    
    await schedulerFunctions.processRawSensorData()
    logger.info('Manual data processing completed')
    res.json({ success: true, message: 'Data processing completed' })
  } catch (error) {
    logger.error('Manual data processing failed', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/scheduler/cleanup", async (req, res) => {
  try {
    if (!schedulerFunctions || typeof schedulerFunctions.cleanupOldData !== 'function') {
      return res.status(400).json({ success: false, error: 'Data cleanup not available' })
    }
    
    await schedulerFunctions.cleanupOldData()
    logger.info('Manual data cleanup completed')
    res.json({ success: true, message: 'Data cleanup completed' })
  } catch (error) {
    logger.error('Manual data cleanup failed', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/scheduler/generate-summary", async (req, res) => {
  try {
    if (!schedulerFunctions || typeof schedulerFunctions.generateDailySummary !== 'function') {
      return res.status(400).json({ success: false, error: 'Summary generation not available' })
    }
    
    await schedulerFunctions.generateDailySummary()
    logger.info('Manual summary generation completed')
    res.json({ success: true, message: 'Daily summary generated' })
  } catch (error) {
    logger.error('Manual summary generation failed', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

console.log("✅ All routes mounted successfully".green.bold)

// Root endpoint with enhanced information
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Enhanced 2tume API!",
    status: "running",
    version: "2.1.0",
    features: [
      "Real-time sensor data streaming",
      "Tank volume calculations and monitoring", 
      "Advanced analytics and reporting",
      "WebSocket authentication",
      "Automated data processing scheduler",
      "Professional sensor support",
      "Enhanced error handling and recovery"
    ],
    services: {
      database: isDatabaseConnected ? "connected" : "disconnected",
      scheduler: isSchedulerInitialized ? "running" : "stopped",
      changeStreams: changeStreamsActive ? "active" : "inactive",
      websocket: "active"
    },
    docs: "/api",
    health: "/health",
  })
})

// Enhanced API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "Enhanced IoT Backend API with Tank Management",
    version: "2.1.0",
    description: "Real-time IoT Backend with WebSocket support, Tank Volume Monitoring, and Analytics",
    features: [
      "Real-time sensor data streaming",
      "Tank volume calculations and monitoring",
      "Advanced analytics and reporting", 
      "WebSocket authentication",
      "Automated data ingestion and processing",
      "Rate limiting (disabled in development)",
      "Query optimization",
      "Enhanced security and error handling",
      "Professional sensor support",
      "Alerts management",
      "Scheduler management"
    ],
    endpoints: {
      // Core API endpoints
      health: "/health",
      users: "/api/users",
      devices: "/api/devices", 
      tankTypes: "/api/tank-types",
      sensorDataIngest: "/api/sensor/raw-data",
      sensorHistory: "/api/sensor/history",
      tankVolumeHistory: "/api/sensor/tank-volume-history/:tankId",
      volumeHistory: "/api/volume-history",
      alerts: "/api/alerts",
      analytics: "/api/sensor/analytic-data",
      latestAnalytics: "/api/sensor/latest-analytics",
      
      // Scheduler management endpoints
      schedulerStatus: "/api/scheduler/status",
      startScheduler: "/api/scheduler/start",
      stopScheduler: "/api/scheduler/stop",
      processData: "/api/scheduler/process-data",
      cleanupData: "/api/scheduler/cleanup", 
      generateSummary: "/api/scheduler/generate-summary",
      
      // WebSocket and Proxy
      websocket: `ws://localhost:${process.env.PORT || 5000}`,
      proxy: "/api/proxy",
    },
    websocket: {
      authentication: "Bearer token required",
      events: ["sensor-data", "tank-volume-update", "device-status", "system-alert"],
    },
  })
})

app.use(errorHandler)

// Enhanced 404 handler with better suggestions
app.use("*", (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    requestId: req.requestId
  })
  
  // Provide helpful suggestions based on the requested path
  let suggestions = [
    "Check the API documentation at /api",
    "Verify the HTTP method",
    "Ensure proper authentication headers",
  ]

  // Add specific suggestions for common mistakes
  if (req.originalUrl.includes('/api/sensor-data')) {
    suggestions.unshift("Did you mean '/api/sensor/sensor-data'?")
  } else if (req.originalUrl.includes('/api/analytics')) {
    suggestions.unshift("Analytics routes are under '/api/sensor/analytic-data'")
  } else if (req.originalUrl.includes('/api/devices') && req.method === 'GET') {
    suggestions.unshift("Device routes: '/api/devices' for listing, '/api/devices/:id' for specific device")
  }
  
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    suggestions,
  })
})

const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    mode: process.env.NODE_ENV || 'development',
    pid: process.pid
  })
  
  isServerReady = true
  
  console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`.yellow.bold)
  console.log(`📡 Health check: http://localhost:${PORT}/health`.cyan)
  console.log(`📚 API docs: http://localhost:${PORT}/api`.cyan)
  console.log(`⚡ WebSocket: ws://localhost:${PORT}`.magenta)
  console.log(`🔗 Proxy endpoints: http://localhost:${PORT}/api/proxy`.magenta)
  console.log(`📊 Analytics endpoints: http://localhost:${PORT}/api/sensor/analytic-data`.magenta)
  console.log(`🔧 Scheduler endpoints: http://localhost:${PORT}/api/scheduler/*`.magenta)
  console.log(`🛢️ Tank volume monitoring: ACTIVE`.green.bold)
  if (process.env.NODE_ENV === "development") {
    console.log(`🔧 Rate limiting is DISABLED for development`.yellow)
  }
})

// Optimized WebSocket server with better connection management
const wss = new WebSocket.Server({
  server,
  perMessageDeflate: false,
  maxPayload: 1024 * 1024,
  verifyClient: (info) => {
    if (wss.clients.size >= 100) {
      console.warn("🚫 WebSocket connection limit reached")
      return false
    }
    return true
  },
})

const authenticatedClients = new Map()

// WebSocket authentication with timeout
const authenticateWebSocketClient = async (token) => {
  try {
    if (!token) return null
    const jwtSecret = process.env.JWT_SECRET || process.env.TOKEN_KEY
    if (!jwtSecret) {
      throw new Error('JWT secret not configured')
    }

    const decoded = jwt.verify(token, jwtSecret)
    const user = await User.findById(decoded.id).select("-password").lean().maxTimeMS(5000)

    return user && user.isActive && (!user.lockUntil || user.lockUntil <= new Date()) ? user : null
  } catch (error) {
    logger.warn('WebSocket authentication failed', { error: error.message })
    return null
  }
}

wss.on("connection", (ws, req) => {
  const clientId = Math.random().toString(36).substring(7)
  const clientIP = req.socket.remoteAddress

  logger.info('New WebSocket connection', { clientId, clientIP })
  console.log(`🔌 New WebSocket connection: ${clientId} from ${clientIP}`.cyan)

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString())

      if (data.type === "auth") {
        if (!data.token) {
          ws.send(JSON.stringify({
            type: "auth-error",
            message: "No token provided",
          }))
          return
        }

        try {
          const jwtSecret = process.env.JWT_SECRET || process.env.TOKEN_KEY
          if (!jwtSecret) {
            ws.send(JSON.stringify({
              type: "auth-error",
              message: "Server configuration error",
            }))
            return
          }

          const decoded = jwt.verify(data.token, jwtSecret)
          const user = await User.findById(decoded.id)
          if (!user) {
            ws.send(JSON.stringify({
              type: "auth-error",
              message: "User not found",
            }))
            return
          }

          authenticatedClients.set(ws, {
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
            clientId,
            authenticatedAt: new Date(),
          })

          ws.send(JSON.stringify({
            type: "auth-success",
            message: "Authentication successful",
            user: {
              id: user._id,
              username: user.username,
              role: user.role,
            },
          }))
        } catch (tokenError) {
          ws.send(JSON.stringify({
            type: "auth-error",
            message: "Invalid token",
          }))
        }
      } else if (data.type === "get_data") {
        const clientInfo = authenticatedClients.get(ws)
        if (!clientInfo) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Not authenticated",
            requestId: data.requestId,
          }))
          return
        }

        try {
          let responseData = null

          // Handle different data types with database availability checks
          if (!isDatabaseConnected && data.dataType !== "system_health") {
            ws.send(JSON.stringify({
              type: "error",
              message: "Database not available",
              requestId: data.requestId,
            }))
            return
          }

          switch (data.dataType) {
            case "dashboard_stats":
              const totalUsers = await User.countDocuments()
              const totalDevices = await Device.countDocuments()
              const activeDevices = await Device.countDocuments({ status: "active" })
              const totalAlerts = await Alert.countDocuments()
              responseData = {
                totalUsers,
                totalDevices,
                activeDevices,
                totalAlerts,
                systemHealth: isDatabaseConnected && isServerReady ? "good" : "degraded",
                schedulerStatus: isSchedulerInitialized ? "running" : "stopped"
              }
              break

            case "system_health":
              responseData = {
                status: isDatabaseConnected && isServerReady ? "healthy" : "degraded",
                database: isDatabaseConnected ? "connected" : "disconnected",
                websocket: "active",
                scheduler: isSchedulerInitialized ? "running" : "stopped",
                changeStreams: changeStreamsActive ? "active" : "inactive",
                lastCheck: new Date(),
              }
              break

            case "scheduler_status":
              const schedulerStatus = schedulerFunctions && typeof schedulerFunctions.getSchedulerStatus === 'function' 
                ? schedulerFunctions.getSchedulerStatus() 
                : { isRunning: false, error: 'Scheduler not available' }
              
              responseData = {
                ...schedulerStatus,
                initialized: isSchedulerInitialized,
                available: !!schedulerFunctions
              }
              break

            // Add other cases as needed...
            default:
              ws.send(JSON.stringify({
                type: "error",
                message: `Unknown data type: ${data.dataType}`,
                requestId: data.requestId,
              }))
              return
          }

          ws.send(JSON.stringify({
            type: "data_response",
            dataType: data.dataType,
            data: responseData,
            requestId: data.requestId,
            timestamp: new Date().toISOString(),
          }))
        } catch (dataError) {
          logger.error('WebSocket data fetch error', { clientId, error: dataError.message })
          ws.send(JSON.stringify({
            type: "error",
            message: `Failed to fetch ${data.dataType}: ${dataError.message}`,
            requestId: data.requestId,
          }))
        }
      } else if (data.type === "ping") {
        ws.send(JSON.stringify({
          type: "pong",
          timestamp: new Date(),
        }))
      }
    } catch (parseError) {
      logger.warn('WebSocket message parse error', { clientId, error: parseError.message })
      ws.send(JSON.stringify({
        type: "error",
        message: "Invalid message format",
      }))
    }
  })

  // Set authentication timeout
  const authTimeout = setTimeout(() => {
    if (!authenticatedClients.has(ws)) {
      ws.send(JSON.stringify({
        type: "auth-timeout",
        message: "Authentication timeout",
      }))
      ws.close(1008, "Authentication timeout")
    }
  }, 30000)

  // Send welcome message
  ws.send(JSON.stringify({
    type: "welcome",
    message: "Connected to Enhanced IoT WebSocket server",
    clientId,
    serverReady: isServerReady,
    databaseReady: isDatabaseConnected,
    timestamp: new Date().toISOString(),
  }))

  ws.on("close", (code, reason) => {
    clearTimeout(authTimeout)
    const clientInfo = authenticatedClients.get(ws)
    if (clientInfo) {
      logger.info('WebSocket client disconnected', { clientId, userId: clientInfo.userId })
      console.log(`👋 [${clientId}] Client disconnected: ${clientInfo.username}`.yellow)
      authenticatedClients.delete(ws)
    }
  })

  ws.on("error", (error) => {
    logger.error('WebSocket error', { clientId, error: error.message })
    console.error(`❌ WebSocket error for client ${clientId}:`, error.message)
    clearTimeout(authTimeout)
    authenticatedClients.delete(ws)
  })
})

// Enhanced change streams with better error handling
const setupChangeStreams = () => {
  if (changeStreamsActive) {
    console.log("ℹ️ [Change Streams] Already active".cyan)
    return
  }

  if (!isDatabaseConnected || mongoose.connection.readyState !== 1) {
    console.log("⚠️ [Change Streams] Database not ready, delaying...".yellow)
    setTimeout(setupChangeStreams, 10000)
    return
  }

  console.log("🔄 [Change Streams] Setting up...".blue)
  
  try {
    const sensorDataChangeStream = SensorData.watch([{ $match: { operationType: "insert" } }], { 
      fullDocument: "updateLookup", 
      maxAwaitTimeMS: 10000
    })
    
    sensorDataChangeStream.on("change", async (change) => {
      try {
        const newSensorData = change.fullDocument
        if (!newSensorData) return
        
        console.log(`📊 [Change Stream] New sensor data: ${newSensorData.deviceId}`)
        
        const device = await Device.findById(newSensorData.deviceId)
          .populate("tankType")
          .populate("assignedToUser")
          .lean()
          .maxTimeMS(8000)
          
        if (!device) return
        
        const enrichedData = {
          ...newSensorData,
          device: {
            _id: device._id,
            name: device.name,
            serialNumber: device.serialNumber,
            type: device.type,
            assignedToUser: device.assignedToUser,
          },
        }
        
        broadcastSensorData(enrichedData)
        
        // Process tank volume if applicable
        let rawLevelReading = null
        if (newSensorData.ultrasonic_liquid_level !== undefined && newSensorData.ultrasonic_liquid_level !== null) {
          rawLevelReading = newSensorData.ultrasonic_liquid_level
        } else if (newSensorData.pressure_level !== undefined && newSensorData.pressure_level !== null) {
          rawLevelReading = newSensorData.pressure_level
        } else if (newSensorData.liquid_level_raw !== undefined && newSensorData.liquid_level_raw !== null) {
          rawLevelReading = newSensorData.liquid_level_raw
        }

        if (rawLevelReading !== null && device.isTankCompatible && device.tankType) {
          try {
            const volumeResult = await processTankVolumeReading(device.tankType, rawLevelReading, newSensorData, device)
            if (volumeResult && volumeResult.success) {
              console.log(`✅ [Tank] Volume processed: ${volumeResult.volumeLiters.toFixed(2)}L`)
              broadcastTankVolumeUpdate(volumeResult)
            }
          } catch (volumeError) {
            console.error(`❌ [Tank] Volume processing error: ${volumeError.message}`)
          }
        }
      } catch (error) {
        logger.error('Error processing change event', { error: error.message })
        console.error("❌ [Change Stream] Processing error:", error.message)
      }
    })

    sensorDataChangeStream.on("error", (error) => {
      changeStreamsActive = false
      logger.error('Change stream error', { error: error.message })
      console.error("❌ [Change Stream] Error:", error.message)
      
      // Retry setup after delay
      setTimeout(() => {
        if (isDatabaseConnected) {
          setupChangeStreams()
        }
      }, 30000)
    })
    
    sensorDataChangeStream.on("close", () => {
      changeStreamsActive = false
      console.warn("🔴 [Change Streams] Closed")
      
      // Retry setup if database is still connected
      setTimeout(() => {
        if (isDatabaseConnected) {
          setupChangeStreams()
        }
      }, 20000)
    })
    
    changeStreamsActive = true
    console.log("✅ [Change Streams] Active".green)
  } catch (error) {
    changeStreamsActive = false
    logger.error('Failed to set up Change Streams', { error: error.message })
    console.error("❌ [Change Streams] Setup failed:", error.message)
    setTimeout(setupChangeStreams, 30000)
  }
}

// Function to broadcast sensor data to authenticated clients
const broadcastSensorData = (data) => {
  const message = JSON.stringify({
    type: "sensor-data",
    data,
    timestamp: new Date().toISOString(),
  })
  
  authenticatedClients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (clientInfo.role === "admin" || (data.device && data.device.assignedToUser && clientInfo.userId === data.device.assignedToUser._id.toString())) {
        try {
          ws.send(message)
        } catch (wsError) {
          console.error(`❌ [WebSocket] Broadcast error: ${wsError.message}`)
          authenticatedClients.delete(ws)
        }
      }
    }
  })
}

// Function to broadcast tank volume updates
const broadcastTankVolumeUpdate = (data) => {
  const message = JSON.stringify({
    type: "tank-volume-update",
    data,
    timestamp: new Date().toISOString(),
  })
  
  authenticatedClients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (clientInfo.role === "admin" || (data.assignedToUser && clientInfo.userId === data.assignedToUser.toString())) {
        try {
          ws.send(message)
        } catch (wsError) {
          console.error(`❌ [WebSocket] Broadcast error: ${wsError.message}`)
          authenticatedClients.delete(ws)
        }
      }
    }
  })
}

const broadcastSystemAlert = (alert) => {
  const message = JSON.stringify({
    type: "system-alert",
    data: alert,
    timestamp: new Date().toISOString(),
  })
  
  authenticatedClients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      const isRelatedToUser = alert.relatedEntities.some((entity) => entity.entityType === "user" && entity.entityId.toString() === clientInfo.userId)
      if (clientInfo.role === "admin" || isRelatedToUser) {
        try {
          ws.send(message)
        } catch (wsError) {
          console.error(`❌ [WebSocket] Broadcast error: ${wsError.message}`)
          authenticatedClients.delete(ws)
        }
      }
    }
  })
}

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info('Graceful shutdown initiated', { signal })
  console.log(`\n📢 Received ${signal}. Shutting down gracefully...`.yellow)

  let shutdownTimer = setTimeout(() => {
    logger.error('Shutdown timeout reached, forcing exit')
    console.error("⚠️ Shutdown timeout, forcing exit".red)
    process.exit(1)
  }, 30000)

  try {
    // Stop scheduler first
    if (schedulerFunctions && typeof schedulerFunctions.stopIngestionScheduler === 'function') {
      try {
        schedulerFunctions.stopIngestionScheduler()
        isSchedulerInitialized = false
        console.log("🔧 [Scheduler] Stopped".cyan)
      } catch (schedError) {
        console.error("❌ [Scheduler] Stop error:", schedError.message)
      }
    }

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed')
      console.log("🛑 [Server] HTTP server closed".yellow)
    })

    // Close WebSocket connections
    wss.clients.forEach((ws) => {
      try {
        ws.close(1000, "Server shutting down")
      } catch (error) {
        console.error("❌ [WebSocket] Close error:", error.message)
      }
    })

    wss.close(() => {
      logger.info('WebSocket server closed')
      console.log("🔌 [WebSocket] Server closed".cyan)
    })

    // Close database connection
    try {
      changeStreamsActive = false
      await mongoose.connection.close()
      isDatabaseConnected = false
      logger.info('MongoDB connection closed')
      console.log("🗄️ [Database] Connection closed".cyan)
    } catch (err) {
      logger.error('Error closing MongoDB connection', { error: err.message })
      console.error("❌ [Database] Close error:", err.message)
    }

    clearTimeout(shutdownTimer)
    logger.info('Graceful shutdown completed')
    console.log("💤 Graceful shutdown completed".green)
    process.exit(0)

  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message })
    console.error("❌ Shutdown error:", error.message)
    clearTimeout(shutdownTimer)
    process.exit(1)
  }
}

// Enhanced process event handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

process.on("unhandledRejection", (err, promise) => {
  logger.error('Unhandled Rejection', {
    error: err.message,
    stack: err.stack
  })

  console.error(`❌ Unhandled Rejection: ${err.message}`.red)
  
  // Don't crash in production for network errors
  const isNetworkError = err.message.includes("ECONNREFUSED") || 
                        err.message.includes("querySrv") ||
                        err.message.includes("getaddrinfo") ||
                        err.message.includes("ENOTFOUND")

  if (isNetworkError && process.env.NODE_ENV === "production") {
    logger.warn('Network error detected, continuing operation')
    console.log("🔄 [Recovery] Network error detected, continuing...".yellow)
  } else if (process.env.NODE_ENV !== "production") {
    console.error("💥 Shutting down due to unhandled rejection".red)
    gracefulShutdown("UNHANDLED_REJECTION")
  }
})

process.on("uncaughtException", (err) => {
  logger.error('Uncaught Exception', {
    error: err.message,
    stack: err.stack
  })

  console.error(`❌ Uncaught Exception: ${err.message}`.bgRed.white.bold)

  const isRecoverableError = err.message.includes("ENOTFOUND") ||
                            err.message.includes("getaddrinfo") ||
                            err.message.includes("ECONNREFUSED") ||
                            err.message.includes("querySrv") ||
                            err.message.includes("startIngestionScheduler is not a function")

  if (isRecoverableError && process.env.NODE_ENV === "production") {
    logger.warn('Recoverable error detected, attempting recovery')
    console.log("🔄 [Recovery] Attempting recovery...".yellow)

    setTimeout(() => {
      if (!isDatabaseConnected && !isConnecting) {
        console.log("🔄 [Recovery] Attempting database reconnection".blue)
        connectWithRetry()
      }
    }, 15000)

    return
  }

  logger.error('Server will shut down due to uncaught exception')
  console.error("💥 Server shutting down due to uncaught exception".red)
  gracefulShutdown("UNCAUGHT_EXCEPTION")
})

// Export for testing purposes
module.exports = { 
  app, 
  server, 
  wss, 
  gracefulShutdown,
  isDatabaseConnected: () => isDatabaseConnected,
  isSchedulerInitialized: () => isSchedulerInitialized,
  changeStreamsActive: () => changeStreamsActive
}