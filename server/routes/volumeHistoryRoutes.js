const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler"); // Assuming you have this middleware
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware");
const ErrorResponse = require("../utils/errorResponse"); // Assuming you have this utility
const errorCodes = require("../utils/errorCodes"); // Assuming you have this utility

// Import controller functions
const {
    createManualVolumeAdjustment,
    getTankVolumeHistory,
    getTankVolumeSummary,
    getLatestVolumeReading,
    deleteVolumeHistoryRecord,
} = require("../controllers/volumeHistoryController");

console.log("[volumeHistoryRoutes.js] Loading volume history routes...");

// Apply authentication middleware to all routes in this file
router.use(userAuthMiddleware);

// @desc Record a manual volume adjustment
// @route POST /api/volume-history
// @access Private (Admin, Editor, or User with tank access)
router.post(
    "/",
    authorizeRoles("user", "admin", "technician"), // Adjust roles as needed
    asyncHandler(createManualVolumeAdjustment) // Use asyncHandler to wrap the controller function
);

// @desc Get tank volume history
// @route GET /api/volume-history/:tankId
// @access Private
router.get(
    "/:tankId",
    authorizeRoles("user", "admin", "technician"), // Adjust roles as needed
    asyncHandler(getTankVolumeHistory)
);

// @desc Get aggregated tank volume statistics
// @route GET /api/volume-history/:tankId/summary
// @access Private
router.get(
    "/:tankId/summary",
    authorizeRoles("user", "admin", "technician"), // Adjust roles as needed
    asyncHandler(getTankVolumeSummary)
);

// @desc Get latest volume reading for a tank
// @route GET /api/volume-history/:tankId/latest
// @access Private
router.get(
    "/:tankId/latest",
    authorizeRoles("user", "admin", "technician"), // Adjust roles as needed
    asyncHandler(getLatestVolumeReading)
);

// @desc Delete volume history record
// @route DELETE /api/volume-history/:id
// @access Private (Admin only)
router.delete(
    "/:id",
    authorizeRoles("admin"), // Only admin can delete
    asyncHandler(deleteVolumeHistoryRecord)
);

console.log("✅ [volumeHistoryRoutes.js] Volume history routes loaded successfully.");

module.exports = router;
