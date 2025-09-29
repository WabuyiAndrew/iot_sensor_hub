const express = require("express")
const router = express.Router()
const alertController = require("../controllers/alertController")
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware")

const {
  getAllAlerts,
  getAlertById,
  updateAlert, // Now accessible by non-admin users if authorized within controller
  deleteAlert,
  getAlertStats,
  getDeviceStats, 
  processAlertsForDevice,
  clearAlertThresholdCache,
} = alertController

// All routes below this line should be protected by userAuthMiddleware
router.use(userAuthMiddleware)

// GET /api/alerts - Protected route for all users.
router.route("/").get(getAllAlerts)

// 👇️ Put specific routes first
// The Controllers for these are assumed to be correctly filtered for non-admin users.
router.route("/stats").get(getAlertStats)
router.route("/device-stats").get(getDeviceStats)

// These remain Admin-only as they are system/configuration functions.
router.route("/process/:deviceId").post(authorizeRoles("admin"), processAlertsForDevice)
router.route("/clear-cache").post(authorizeRoles("admin"), clearAlertThresholdCache)

// 👇️ Then put the generic ID route last
router
  .route("/:id")
  .get(getAlertById)
  // ✅ FIX: Remove 'authorizeRoles("admin")'. This enables non-admin users (like technicians)
  // to acknowledge/resolve alerts, relying on the robust access check inside updateAlert.
  .put(updateAlert) 
  // Deleting alerts remains an Admin-only function for data integrity.
  .delete(authorizeRoles("admin"), deleteAlert) 

module.exports = router