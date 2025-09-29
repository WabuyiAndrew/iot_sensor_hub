const express = require("express")
const router = express.Router()

console.log("🔐 [Routes] Auth routes loading...")

// Import authentication functions
const { userVerification, userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware")
const { loginUser } = require("../controllers/userController")

// =========================================================================
// PUBLIC AUTH ROUTES
// =========================================================================

/**
 * @desc    User login
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post("/login", loginUser)

/**
 * @desc    User verification
 * @route   POST /api/auth/verify
 * @access  Public
 */
router.post("/verify", userVerification)

/**
 * @desc    User logout (client-side mostly, but can clear server-side sessions)
 * @route   POST /api/auth/logout
 * @access  Public
 */
router.post("/logout", (req, res) => {
  console.log(`[AuthRoutes] Logout request received | Request ID: ${req.requestId}`)

  // Since we're using JWT tokens (stateless), logout is mainly client-side
  // But we can provide a response to confirm logout
  res.status(200).json({
    success: true,
    message: "Logout successful",
    timestamp: new Date().toISOString(),
  })
})

// =========================================================================
// PROTECTED AUTH ROUTES (Require authentication)
// =========================================================================
router.use(userAuthMiddleware)

/**
 * @desc    Get current user info with role-based data
 * @route   GET /api/auth/me
 * @access  Protected (All authenticated users)
 */
router.get("/me", (req, res) => {
  console.log(`[AuthRoutes] Get current user: ${req.user.username} (${req.user.role}) | Request ID: ${req.requestId}`)

  // Return user info with role-specific permissions
  const userResponse = {
    success: true,
    user: {
      _id: req.user._id,
      username: req.user.username,
      emailid: req.user.emailid,
      fullName: req.user.fullName,
      role: req.user.role,
      isActive: req.user.isActive,
      lastLogin: req.user.lastLogin,
      preferences: req.user.preferences,
      permissions: getUserPermissions(req.user.role),
    },
    timestamp: new Date().toISOString(),
  }

  res.status(200).json(userResponse)
})

/**
 * @desc    Get user permissions based on role
 * @route   GET /api/auth/permissions
 * @access  Protected (All authenticated users)
 */
router.get("/permissions", (req, res) => {
  console.log(
    `[AuthRoutes] Get permissions for: ${req.user.username} (${req.user.role}) | Request ID: ${req.requestId}`,
  )

  const permissions = getUserPermissions(req.user.role)

  res.status(200).json({
    success: true,
    role: req.user.role,
    permissions,
    timestamp: new Date().toISOString(),
  })
})

/**
 * @desc    Check if user has specific permission
 * @route   POST /api/auth/check-permission
 * @access  Protected (All authenticated users)
 */
router.post("/check-permission", (req, res) => {
  const { permission } = req.body

  if (!permission) {
    return res.status(400).json({
      success: false,
      message: "Permission parameter is required",
    })
  }

  const userPermissions = getUserPermissions(req.user.role)
  const hasPermission = userPermissions.includes(permission)

  console.log(
    `[AuthRoutes] Permission check: ${req.user.username} (${req.user.role}) - ${permission}: ${hasPermission}`,
  )

  res.status(200).json({
    success: true,
    permission,
    hasPermission,
    role: req.user.role,
    timestamp: new Date().toISOString(),
  })
})

/**
 * Helper function to get permissions based on user role
 */
function getUserPermissions(role) {
  const permissions = {
    admin: [
      // User management
      "users:read",
      "users:create",
      "users:update",
      "users:delete",
      "users:manage_roles",

      // Device management
      "devices:read",
      "devices:create",
      "devices:update",
      "devices:delete",
      "devices:assign",
      "devices:unassign",
      "devices:manage_all",

      // Sensor data
      "sensor_data:read_all",
      "sensor_data:delete",
      "sensor_data:export",

      // Tank types
      "tank_types:read",
      "tank_types:create",
      "tank_types:update",
      "tank_types:delete",

      // System
      "system:stats",
      "system:logs",
      "system:maintenance",
      "system:settings",
    ],

    technician: [
      // Device management (limited)
      "devices:read",
      "devices:update",
      "devices:assign",
      "devices:maintenance",

      // Sensor data (read only)
      "sensor_data:read_assigned",
      "sensor_data:export",

      // Tank types (read only)
      "tank_types:read",

      // User profile
      "profile:read",
      "profile:update",
    ],

    user: [
      // Own devices only
      "devices:read_own",

      // Own sensor data only
      "sensor_data:read_own",

      // Tank types (read only)
      "tank_types:read",

      // User profile
      "profile:read",
      "profile:update",
      "profile:change_password",
    ],
  }

  return permissions[role] || []
}

console.log("✅ [Routes] Auth routes loaded successfully")

module.exports = router
