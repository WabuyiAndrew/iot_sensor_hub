// routes/deviceRoutes.js
const express = require("express");
const router = express.Router();
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware");

const {
  createDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  linkDeviceToTank,
  unlinkDeviceFromTank,
  getAllDevicesSensorData,
  getMyDevicesSensorData,
  getLatestSensorDataForDevice,
  getDeviceHistory,
  getMyDevices,
  getUnassignedDevices,
  getTankCapableDevices,
  getDeviceStats,
  triggerVolumeProcessingForDevice,
  getDeviceStatusList, // ✅ NEW: Import the new function
} = require("../controllers/deviceController");

console.log("[deviceRoutes.js] Device routes loaded successfully");

// Public routes (if any, though status API might be public based on docs)
// NOTE: The provided API documentation for Fetch Device Status shows a base URL
// that implies it's public. If you want it protected, add userAuthMiddleware.
// For now, I'm placing it before the router.use(userAuthMiddleware) for public access.
router.get("/status", getDeviceStatusList); // ✅ NEW: Device Status API

// Protected routes - All routes below this will use userAuthMiddleware
router.use(userAuthMiddleware);

// Device management routes
router.route("/")
  .post(authorizeRoles("admin"), createDevice)
  .get(authorizeRoles("admin"), getAllDevices);

router.get("/my-devices", authorizeRoles("user", "admin", "technician"), getMyDevices);
router.get("/unassigned", authorizeRoles("admin"), getUnassignedDevices);
router.get("/tank-capable", authorizeRoles("admin"), getTankCapableDevices);
router.get("/stats", authorizeRoles("admin"), getDeviceStats);

// Device-Tank linking routes
router.post("/link-to-tank", authorizeRoles("admin"), linkDeviceToTank);
router.delete("/unlink-from-tank/:deviceId", authorizeRoles("admin"), unlinkDeviceFromTank);

// Sensor data related to devices
router.get("/all-sensor-data", authorizeRoles("admin"), getAllDevicesSensorData);
router.get("/sensor-data/my-devices", authorizeRoles("user", "admin", "technician"), getMyDevicesSensorData);
router.get("/sensor-data/latest/:deviceId", authorizeRoles("user", "admin", "technician"), getLatestSensorDataForDevice);
router.get("/sensor-data/history/:deviceId", authorizeRoles("user", "admin", "technician"), getDeviceHistory);

// Manual volume processing trigger for a device
router.post("/:deviceId/process-volume", authorizeRoles("user", "admin", "technician"), triggerVolumeProcessingForDevice);

// Specific device routes (must be last to avoid conflicts)
router.route("/:id")
  .get(authorizeRoles("user", "admin", "technician"), getDeviceById)
  .put(authorizeRoles("admin"), updateDevice)
  .delete(authorizeRoles("admin"), deleteDevice);

console.log("✅ [deviceRoutes.js] Device routes loaded successfully");

module.exports = router;
