const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware");

// Import all controller functions
const {
  createTankType,
  getAllTankTypes,
  getTankTypeById,
  updateTankType,
  deleteTankType,
  getUserAccessibleTanks,
  manualVolumeRecalculation,
  triggerVolumeProcessingForTank,
  getLatestTankVolumeEndpoint,
} = require("../controllers/tankTypeController");

console.log("[tankTypeRoutes.js] Loading tank type routes...");

// Apply userAuthMiddleware to all routes in this file
router.use(userAuthMiddleware);

// Tank management routes
router.get("/", authorizeRoles("user", "admin", "technician"), asyncHandler(getAllTankTypes));
router.post("/", authorizeRoles("admin"), asyncHandler(createTankType));

// User-specific accessible tanks
router.get("/user/accessible", authorizeRoles("user", "admin", "technician"), asyncHandler(getUserAccessibleTanks));

// Volume processing and history routes (Tank-specific)
router.post("/:id/trigger-volume", authorizeRoles("user", "admin", "technician"), asyncHandler(triggerVolumeProcessingForTank));
router.post("/:id/recalculate-volume", authorizeRoles("admin", "technician"), asyncHandler(manualVolumeRecalculation));
router.get("/:id/latest-volume", authorizeRoles("user", "admin", "technician"), asyncHandler(getLatestTankVolumeEndpoint));


// Tank-specific routes (must be last to avoid conflicts with other /:id routes)
router.route("/:id")
  .get(authorizeRoles("user", "admin", "technician"), asyncHandler(getTankTypeById))
  .put(authorizeRoles("admin"), asyncHandler(updateTankType))
  .delete(authorizeRoles("admin"), asyncHandler(deleteTankType));

console.log("✅ [tankTypeRoutes.js] Tank type routes loaded successfully.");

module.exports = router;
