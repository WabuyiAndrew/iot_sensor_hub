const express = require("express")
const router = express.Router()

// Import authentication middleware
const AuthMiddleware = require("../middleware/AuthMiddleware")

console.log("[deviceRoutes.js] Imported AuthMiddleware object:", AuthMiddleware)

const { userAuthMiddleware, authorizeRoles, userVerification, checkResourceOwnership } = AuthMiddleware

const {
  createDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  linkDeviceToTank,
  unlinkDeviceFromTank,
  triggerVolumeProcessingForDevice,
  getMyDevices,
  getUnassignedDevices,
  getTankCapableDevices,
  getDeviceStats,
  getMyDevicesSensorData,
  getLatestSensorDataForDevice,
  getDeviceHistory,
  getAllDevicesSensorData,
  getDeviceStatus, // New function for external API device status
  getDeviceStatusBySerial,
  getAllDevicesStatus,
} = require("../controllers/deviceController")

console.log("[deviceRoutes.js] Loading device routes...")
console.log("[deviceRoutes.js] Debugging userAuthMiddleware:")
console.log("  Type of userAuthMiddleware:", typeof userAuthMiddleware)
console.log("  Value of userAuthMiddleware:", userAuthMiddleware)

// ✅ PROTECTED ROUTES - All routes below this will use userAuthMiddleware
router.use(userAuthMiddleware)

// --- Specific Routes (MUST come before /:id routes) ---

router.get("/sensor-data/my-devices", getMyDevicesSensorData)
router.get("/sensor-data/latest/:serialNumber", getLatestSensorDataForDevice)

// router.get('/sensor-data/latest/', protect, getLatestSensorDataForDevice);
router.get("/sensor-data/history/:deviceId", getDeviceHistory)
router.get("/all-sensor-data", authorizeRoles("admin"), getAllDevicesSensorData)

// Device status routes using external API
router.get("/status", getDeviceStatus)
router.get("/status/by-serial/:serialNumber", getDeviceStatusBySerial)
router.get("/status/all", authorizeRoles("admin"), getAllDevicesStatus)
router.get("/status/:deviceId", getDeviceStatus)

// User-specific device lists
router.get("/my-devices", getMyDevices)
router.get("/unassigned", authorizeRoles("admin"), getUnassignedDevices)
router.get("/tank-capable", getTankCapableDevices) // Updated to use external API

// Device statistics
router.get("/stats", authorizeRoles("admin"), getDeviceStats)

// Device linking/unlinking with tanks (Admin only) - requires local database
router.post("/link-to-tank", authorizeRoles("admin"), linkDeviceToTank)
router.delete("/unlink-from-tank/:deviceId", authorizeRoles("admin"), unlinkDeviceFromTank)

// Manual volume processing for a specific device (Admin or assigned user) - requires local database
router.post("/:deviceId/process-volume", triggerVolumeProcessingForDevice)

// --- General Routes (MUST come AFTER specific routes) ---

router
  .route("/")
  .post(authorizeRoles("admin"), createDevice) // Still requires local database
  .get(getAllDevices) // Now uses external API

// Specific device operations by ID
router
  .route("/:id")
  .get(getDeviceById) // Now uses external API
  .put(authorizeRoles("admin"), updateDevice) // Still requires local database
  .delete(authorizeRoles("admin"), deleteDevice) // Still requires local database

console.log("✅ [deviceRoutes.js] Device routes loaded successfully")

module.exports = router
