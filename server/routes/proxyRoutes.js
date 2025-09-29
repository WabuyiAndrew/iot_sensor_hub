const express = require("express")
const router = express.Router()

// Import authentication middleware
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware")

// Import proxy controller functions
const {
  getDeviceStatus,
  getAnalyticsData,
  getRawSensorData,
  checkExternalApiHealth,
} = require("../controllers/proxyController")

console.log("[proxyRoutes.js] Loading proxy routes...")

// Health check endpoint (public for monitoring)
router.get("/health", checkExternalApiHealth)

// ✅ PROTECTED ROUTES - All routes below require authentication
router.use(userAuthMiddleware)

// Device status proxy endpoint
// GET /api/proxy/device-status?devices=device1,device2,device3
router.get("/device-status", getDeviceStatus)

// Analytics data proxy endpoint
// GET /api/proxy/analytics-data?startDate=2025-07-01&period=MONTHLY&deviceType=Level1
router.get("/analytics-data", getAnalyticsData)

// Raw sensor data proxy endpoint with pagination
// GET /api/proxy/sensor-data?page=0&size=10&deviceNumber=device1&deviceType=Level1
router.get("/sensor-data", getRawSensorData)

console.log("✅ [proxyRoutes.js] Proxy routes loaded successfully")
console.log("Available proxy routes:")
console.log("  GET /health - External API health check (public)")
console.log("  GET /device-status - Device status proxy (protected)")
console.log("  GET /analytics-data - Analytics data proxy (protected)")
console.log("  GET /sensor-data - Raw sensor data proxy (protected)")

module.exports = router
