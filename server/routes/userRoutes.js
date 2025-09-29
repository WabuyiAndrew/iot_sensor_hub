const express = require("express")
const router = express.Router()

console.log("👤 [Routes] User routes loading...")

// Import user controller functions with error handling
let userController;
try {
  userController = require("../controllers/userController");
  console.log("[userRoutes.js] Successfully imported userController");
  console.log("[userRoutes.js] Available functions:", Object.keys(userController));
} catch (error) {
  console.error("[userRoutes.js] Error importing userController:", error.message);
  throw error;
}

// Validate that all required functions exist
const requiredFunctions = [
  'createUser', 'loginUser', 'getAllUsers', 'getUserById', 
  'updateUser', 'deleteUser', 'getLoggedInUser', 'updateUserProfile', 
  'changePassword', 'getUserStats', 'forgotPassword', 'resetPassword'
];

const missingFunctions = requiredFunctions.filter(funcName => {
  const func = userController[funcName];
  const isValid = typeof func === 'function';
  if (!isValid) {
    console.error(`[userRoutes.js] Missing or invalid function: ${funcName} (type: ${typeof func})`);
  }
  return !isValid;
});

if (missingFunctions.length > 0) {
  throw new Error(`Missing required functions in userController: ${missingFunctions.join(', ')}`);
}

// Destructure functions after validation
const {
  createUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getLoggedInUser,
  updateUserProfile,
  changePassword,
  getUserStats,
  forgotPassword,
  resetPassword,
} = userController;

// Import authentication middleware with error handling
let AuthMiddleware;
try {
  AuthMiddleware = require("../middleware/AuthMiddleware");
  console.log("[userRoutes.js] Successfully imported AuthMiddleware");
  console.log("[userRoutes.js] Available middleware:", Object.keys(AuthMiddleware));
} catch (error) {
  console.error("[userRoutes.js] Error importing AuthMiddleware:", error.message);
  throw error;
}

// Validate middleware functions
const requiredMiddleware = ['userAuthMiddleware', 'authorizeRoles', 'userVerification', 'checkResourceOwnership'];
const missingMiddleware = requiredMiddleware.filter(middlewareName => {
  const middleware = AuthMiddleware[middlewareName];
  const isValid = typeof middleware === 'function';
  if (!isValid) {
    console.error(`[userRoutes.js] Missing or invalid middleware: ${middlewareName} (type: ${typeof middleware})`);
  }
  return !isValid;
});

if (missingMiddleware.length > 0) {
  throw new Error(`Missing required middleware in AuthMiddleware: ${missingMiddleware.join(', ')}`);
}

const {
  userAuthMiddleware,
  authorizeRoles,
  userVerification,
  checkResourceOwnership,
} = AuthMiddleware;

// =========================================================================
// PUBLIC ROUTES (No authentication required)
// =========================================================================
router.post("/login", loginUser)
router.post("/verify", userVerification)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", resetPassword)

// =========================================================================
// PROTECTED ROUTES (Authentication required)
// =========================================================================
router.use(userAuthMiddleware)

// User profile routes
router.get("/profile", authorizeRoles("user", "admin"), getLoggedInUser)
router.get("/me", authorizeRoles("user", "admin"), getLoggedInUser)
router.put("/profile", authorizeRoles("user", "admin"), updateUserProfile)
router.put("/change-password", authorizeRoles("user", "admin"), changePassword)

// Admin-only user management routes
router.get("/", authorizeRoles("admin"), getAllUsers)
router.get("/stats", authorizeRoles("admin"), getUserStats)

// Debug the problematic route
console.log("[userRoutes.js] Setting up POST / route:");
console.log("  createUser type:", typeof createUser);
console.log("  createUser function:", createUser ? "exists" : "missing");
console.log("  authorizeRoles type:", typeof authorizeRoles);

// The problematic route - let's add more debugging
try {
  const adminAuth = authorizeRoles("admin");
  console.log("  authorizeRoles('admin') result:", typeof adminAuth);
  
  if (typeof createUser !== 'function') {
    throw new Error(`createUser is not a function, it's: ${typeof createUser}`);
  }
  
  if (typeof adminAuth !== 'function') {
    throw new Error(`authorizeRoles('admin') is not a function, it's: ${typeof adminAuth}`);
  }
  
  router.post("/", adminAuth, createUser);
  console.log("✅ POST / route created successfully");
} catch (error) {
  console.error("❌ Error creating POST / route:", error.message);
  throw error;
}

// User-specific routes with ownership check
router.get("/:id", authorizeRoles("user", "admin"), checkResourceOwnership(), getUserById)
router.put("/:id", authorizeRoles("admin"), updateUser)
router.delete("/:id", authorizeRoles("admin"), deleteUser)

console.log("✅ [Routes] User routes loaded successfully")

module.exports = router
