// backend/routes/system-routes.js
const express = require("express");
const router = express.Router();
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware");
const { getSystemStats, getSystemHealth } = require("../controllers/systemController");

console.log("⚙️ [Routes] System routes loading...");

// All system routes require authentication and admin role
router.use(userAuthMiddleware);

// Get overall system statistics
router.get("/stats", authorizeRoles("admin"), getSystemStats);

// Get system health status
router.get("/health", authorizeRoles("admin"), getSystemHealth);

console.log("✅ [Routes] System routes loaded successfully.");

module.exports = router;
