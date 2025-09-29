const express = require("express")
const router = express.Router()
const rateLimit = require("express-rate-limit")
const asyncHandler = require("../middleware/asyncHandler")
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware")
const { ErrorResponse } = require("../utils/errorResponse")
const {
  startIngestionScheduler,
  stopIngestionScheduler,
  getSchedulerStatus,
  fetchAndDistributeRawData,
  cleanupOldData,
} = require("../tasks/ingestionScheduler")

const {
  getRawSensorDataPaginated,
  getSensorDataById,
  getSensorDataByDeviceIdAndParameter,
  createSensorDataReading,
  cleanupOldSensorData,
  getLatestAnalyticsData,
} = require("../controllers/sensorDataController")

const {
  getAnalyticSensorData,
  getHistoricalAnalytics,
  getHistoricalRange,
} = require("../controllers/analyticsController")

const { processSensorData } = require("../services/sensorDataProcessor")

const { clearThresholdCache, getCachedThresholds, loadThresholds } = require("../services/alertGenerator")

// Rate limiting for public sensor data
const sensorDataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many sensor data requests from this IP, please try again later.",
})

// --- Public routes ---
router.get("/sensor-data", sensorDataLimiter, getRawSensorDataPaginated)

router.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: "Sensor API proxy is healthy",
      timestamp: new Date().toISOString(),
      source: "external_api_proxy",
    })
  }),
)

// --- Authenticated routes ---
router.use(userAuthMiddleware)

// 1️⃣ Analytics routes (specific first)
router.get("/analytic-data", getAnalyticSensorData)
router.get("/historical-analytics", getHistoricalAnalytics)
router.get("/historical-range", getHistoricalRange)
router.get("/latest-analytics/:serialNumber", getLatestAnalyticsData)

// 2️⃣ Specific device parameter history
router.get("/device/:serialNumber/:parameter", getSensorDataByDeviceIdAndParameter)

// 3️⃣ Sensor record by MongoDB ObjectId only (regex to avoid conflicts)
router.get("/:id([0-9a-fA-F]{24})", getSensorDataById)

// 4️⃣ Raw data ingestion and creation with alert processing
router.post(
  "/raw-data",
  asyncHandler(async (req, res) => {
    try {
      const sensorData = await createSensorDataReading(req.body)

      // Process alerts after saving sensor data
      const alertResult = await processSensorData(req.body)

      res.status(200).json({
        success: true,
        message: "Sensor data saved successfully",
        data: sensorData,
        alertsGenerated: alertResult.alertsGenerated,
        alertsSummary: alertResult.summary,
      })
    } catch (error) {
      console.error("Error saving sensor data:", error)
      res.status(500).json({
        success: false,
        message: "Failed to save sensor data",
        error: error.message,
      })
    }
  }),
)

// 5️⃣ Admin-only routes
router.delete("/cleanup", authorizeRoles("admin"), cleanupOldSensorData)

// --- 6️⃣ Scheduler Management (Admin-only) ---
router.post(
  "/scheduler/start",
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    startIngestionScheduler()
    res.status(200).json({ success: true, message: "Scheduler started." })
  }),
)

router.post(
  "/scheduler/stop",
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    stopIngestionScheduler()
    res.status(200).json({ success: true, message: "Scheduler stopped." })
  }),
)

router.get(
  "/scheduler/status",
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const status = getSchedulerStatus()
    res.status(200).json({ success: true, data: status })
  }),
)

router.post(
  "/scheduler/trigger/ingestion",
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    await fetchAndDistributeRawData()
    res.status(200).json({ success: true, message: "Ingestion triggered manually." })
  }),
)

router.post(
  "/scheduler/trigger/cleanup",
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    await cleanupOldData()
    res.status(200).json({ success: true, message: "Cleanup triggered manually." })
  }),
)

// --- 7️⃣ Alert Threshold Cache Management (Admin-only) ---
router.post(
  "/alert-cache/clear",
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    clearThresholdCache()
    res.status(200).json({
      success: true,
      message: "Alert threshold cache cleared successfully.",
    })
  }),
)

router.get(
  "/alert-cache/status",
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const cachedThresholds = getCachedThresholds()
    res.status(200).json({
      success: true,
      data: {
        cacheSize: cachedThresholds.length,
        thresholds: cachedThresholds,
      },
    })
  }),
)

router.post(
  "/alert-cache/reload",
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    await loadThresholds()
    const cachedThresholds = getCachedThresholds()
    res.status(200).json({
      success: true,
      message: "Alert threshold cache reloaded successfully.",
      data: {
        cacheSize: cachedThresholds.length,
      },
    })
  }),
)

module.exports = router
