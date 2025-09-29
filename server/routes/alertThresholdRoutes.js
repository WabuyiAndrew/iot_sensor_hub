// backend/routes/alertThresholdRoutes.js
const express = require("express")
const router = express.Router()
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware")

// Import alert threshold controller functions
let alertThresholdController
try {
  alertThresholdController = require("../controllers/alertThresholdController")
  console.log("[alertThresholdRoutes.js] Successfully imported alertThresholdController")
  console.log("[alertThresholdRoutes.js] Available functions:", Object.keys(alertThresholdController))
} catch (error) {
  console.error("[alertThresholdRoutes.js] Error importing alertThresholdController:", error.message)
  throw error
}

const {
  getAllThresholds,
  getThresholdById,
  createThreshold,
  updateThreshold,
  deleteThreshold,
  initializeDefaultThresholds,
  getThresholdStats,
} = alertThresholdController

console.log("[alertThresholdRoutes.js] Loading alert threshold routes...")

// ✅ PROTECTED ROUTES - All routes below this will use userAuthMiddleware
router.use(userAuthMiddleware)

// Routes for alert thresholds
router
  .route("/")
  .get(authorizeRoles("user", "admin", "technician"), getAllThresholds) // Get all thresholds (all roles can view)
  .post(authorizeRoles("admin"), createThreshold) // Create threshold (admin only)

router.route("/stats").get(authorizeRoles("admin"), getThresholdStats) // Get threshold statistics (admin only)

router.route("/initialize-defaults").post(authorizeRoles("admin"), initializeDefaultThresholds) // Initialize default thresholds (admin only)

router
  .route("/:id")
  .get(authorizeRoles("user", "admin", "technician"), getThresholdById) // Get single threshold (all roles can view)
  .put(authorizeRoles("admin"), updateThreshold) // Update threshold (admin only)
  .delete(authorizeRoles("admin"), deleteThreshold) // Delete threshold (admin only)

console.log("✅ [alertThresholdRoutes.js] Alert threshold routes loaded successfully.")

module.exports = router
