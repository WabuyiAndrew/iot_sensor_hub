// middleware/AuthMiddleware.js
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../utils/errorResponse");
const errorCodes = require("../utils/errorCodes");
const { getModels } = require("../utils/modelHelpers"); // Get models dynamically

// Placeholder for getUserPermissions. You should define this based on your roles and permissions.
// Example:
function getUserPermissions(role) {
  switch (role) {
    case "admin":
      return ["read:all", "write:all", "delete:all", "manage:users", "manage:devices", "manage:tanks", "manage:alerts"];
    case "technician":
      return ["read:all", "write:devices", "write:tanks", "trigger:volume", "manage:alerts"];
    case "user":
      return ["read:my_data", "read:my_devices", "read:my_tanks", "trigger:volume", "read:my_alerts"];
    default:
      return [];
  }
}

/**
 * @desc Creates a signed JWT token.
 * @param {string} id - The user's MongoDB ObjectId.
 * @param {object} [additionalPayload={}] - Optional additional data.
 * @returns {string} The signed JWT.
 */
const createSecretToken = (id, additionalPayload = {}) => {
  if (!process.env.TOKEN_KEY) {
    throw new Error("TOKEN_KEY environment variable is not set");
  }

  const payload = {
    id,
    iat: Math.floor(Date.now() / 1000),
    ...additionalPayload,
  };

  return jwt.sign(payload, process.env.TOKEN_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    issuer: process.env.JWT_ISSUER || "iot-backend",
    audience: process.env.JWT_AUDIENCE || "iot-users",
  });
};

/**
 * @desc Middleware for user authentication using JWT.
 */
const userAuthMiddleware = async (req, res, next) => {
  try {
    const { User } = getModels();
    const authHeader = req.headers["authorization"];
    let token = authHeader && authHeader.split(" ")[1];

    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new ErrorResponse("Unauthorized: No token provided.", 401, errorCodes.NO_TOKEN));
    }

    const decodedToken = jwt.verify(token, process.env.TOKEN_KEY, {
      issuer: process.env.JWT_ISSUER || "iot-backend",
      audience: process.env.JWT_AUDIENCE || "iot-users",
    });

    if (!decodedToken.id || !decodedToken.id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new ErrorResponse("Invalid user ID format.", 400, errorCodes.INVALID_USER_ID));
    }

    const user = await User.findById(decodedToken.id).select("-password -loginAttempts -lockUntil").lean();

    if (!user) {
      return next(new ErrorResponse("Forbidden: User not found.", 404, errorCodes.USER_NOT_FOUND));
    }

    if (!user.isActive) {
      return next(new ErrorResponse("Forbidden: User account is inactive.", 403, errorCodes.USER_INACTIVE));
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return next(new ErrorResponse("Account temporarily locked.", 423, errorCodes.USER_LOCKED, {
        lockUntil: user.lockUntil,
      }));
    }

    // THIS IS THE CRITICAL CHANGE
    req.user = {
      ...user,
      id: user._id.toString(), // Add the ID property explicitly
      tokenIssuedAt: decodedToken.iat,
      tokenExpiresAt: decodedToken.exp,
    };

    if (process.env.UPDATE_LAST_SEEN !== "false") {
      User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch((err) => {
        console.warn(`⚠️ [Auth] Could not update last login for user ${user._id}:`, err.message);
      });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ErrorResponse("Forbidden: Token has expired.", 403, errorCodes.TOKEN_EXPIRED, {
        expiredAt: error.expiredAt,
      }));
    }
    if (error.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Forbidden: Invalid token.", 403, errorCodes.INVALID_TOKEN));
    }
    if (error.name === "NotBeforeError") {
      return next(new ErrorResponse("Forbidden: Token not active yet.", 403, errorCodes.TOKEN_NOT_ACTIVE));
    }

    next(new ErrorResponse("Internal server error during authentication.", 500, errorCodes.AUTH_SERVER_ERROR));
  }
};

/**
 * @desc Middleware for role-based authorization.
 * @param {...string} roles - A list of allowed roles (e.g., "admin", "user", "technician").
 * @returns {function} An Express middleware function.
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ErrorResponse("Unauthorized: User not authenticated.", 401, errorCodes.USER_NOT_AUTHENTICATED));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`Access denied. Your role (${req.user.role}) is not authorized.`, 403, errorCodes.INSUFFICIENT_PERMISSIONS, {
        requiredRoles: roles,
        userRole: req.user.role,
      }));
    }

    next();
  };
};

/**
 * @desc Middleware for verifying a user's token. This is used for public-facing
 * verification routes.
 */
const userVerification = (req, res, next) => {
  console.log("[Auth] Running userVerification middleware...");
  // This is a simplified version of userAuthMiddleware that doesn't necessarily
  // need to find the user, but just verify the token's authenticity.
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, process.env.TOKEN_KEY);
      console.log("[Auth] Token verified successfully.");
    } catch (err) {
      console.error("[Auth] Token verification failed:", err.message);
    }
  }
  next();
};

/**
 * @desc Middleware that checks if an authenticated user has ownership of a resource.
 * This is a higher-order function that returns a middleware.
 */
const checkResourceOwnership = () => {
  return (req, res, next) => {
    console.log("[Auth] Running checkResourceOwnership middleware...");
    const loggedInUserId = req.user ? req.user._id.toString() : null;
    const resourceOwnerId = req.params.id;

    if (!loggedInUserId) {
      return next(new ErrorResponse("Unauthorized: User not authenticated.", 401));
    }

    if (loggedInUserId !== resourceOwnerId && req.user.role !== 'admin') {
      return next(new ErrorResponse("Access denied: You do not have permission to access this resource.", 403));
    }

    console.log(`[Auth] User '${loggedInUserId}' has ownership or is an admin.`);
    next();
  };
};

/**
 * @desc Permission-based authorization middleware.
 * @param {string} permission - The specific permission required.
 * @returns {function} An Express middleware function.
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse("Unauthorized: User not authenticated.", 401, errorCodes.USER_NOT_AUTHENTICATED));
    }

    const userPermissions = getUserPermissions(req.user.role);
    const hasPermission = userPermissions.includes(permission);

    if (!hasPermission) {
      return next(new ErrorResponse(`Access denied. You don't have permission: ${permission}`, 403, errorCodes.INSUFFICIENT_PERMISSIONS, {
        requiredPermission: permission,
        userRole: req.user.role,
      }));
    }

    next();
  };
};

module.exports = {
  createSecretToken,
  userAuthMiddleware,
  authorizeRoles,
  userVerification,      // <-- New export
  checkResourceOwnership, // <-- New export
  requirePermission,
  getUserPermissions,
};
