// utils/permissionHelpers.js
/**
 * @desc Helper function to define and retrieve permissions based on user role.
 * This centralizes permission definitions.
 * @param {string} role - The role of the user.
 * @returns {string[]} An array of permissions for the given role.
 */
function getUserPermissions(role) {
  const permissions = {
    admin: [
      "users:read", "users:create", "users:update", "users:delete", "users:manage_roles",
      "devices:read", "devices:create", "devices:update", "devices:delete",
      "devices:assign", "devices:unassign",
      "devices:manage_all",
      "sensor_data:read_all", "sensor_data:delete", "sensor_data:export",
      "tank_types:read", "tank_types:create", "tank_types:update", "tank_types:delete",
      "blog:read", "blog:create", "blog:update", "blog:delete", "blog:publish", "blog:manage_all",
      "system:stats", "system:logs", "system:maintenance", "system:settings",
    ],
    technician: [
      "devices:read", "devices:update", "devices:assign", "devices:maintenance",
      "sensor_data:read_assigned", "sensor_data:export",
      "tank_types:read",
      "blog:read",
      "profile:read", "profile:update",
    ],
    user: [
      "devices:read_own",
      "sensor_data:read_own",
      "tank_types:read",
      "blog:read",
      "profile:read", "profile:update", "profile:change_password",
    ],
  };
  return permissions[role] || [];
}

module.exports = {
  getUserPermissions,
};