const TankType = require("../models/tankType")
const Device = require("../models/Device")

/**
 * Check if a user has access to tank types based on device assignments
 * GET /api/tank-types/user-tank-access
 */
const checkUserTankAccess = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    console.log(`[TankAccess] Checking tank access for user: ${userId} (${userRole})`)

    // Admin always has access
    if (userRole === "admin") {
      return res.json({
        success: true,
        hasAccess: true,
        reason: "Admin user has full access",
        assignedTanks: [],
      })
    }

    // For regular users, check if they have any devices assigned to tanks
    const userDevices = await Device.find({ assignedTo: userId })

    if (!userDevices || userDevices.length === 0) {
      return res.json({
        success: true,
        hasAccess: false,
        reason: "No devices assigned to user",
        assignedTanks: [],
      })
    }

    const userDeviceIds = userDevices.map((device) => device._id)
    console.log(`[TankAccess] User has ${userDeviceIds.length} devices`)

    // Find tanks that have any of the user's devices connected
    const tanksWithUserDevices = await TankType.find({
      connectedDevices: { $in: userDeviceIds },
    }).populate("connectedDevices", "name serialNumber sensorType")

    const hasAccess = tanksWithUserDevices.length > 0

    console.log(`[TankAccess] User has access to ${tanksWithUserDevices.length} tanks`)

    return res.json({
      success: true,
      hasAccess: hasAccess,
      reason: hasAccess
        ? `User has devices connected to ${tanksWithUserDevices.length} tank(s)`
        : "No user devices are connected to any tanks",
      assignedTanks: tanksWithUserDevices.map((tank) => ({
        id: tank._id,
        name: tank.name,
        location: tank.location,
        materialType: tank.materialType,
        connectedUserDevices: tank.connectedDevices.filter((device) =>
          userDeviceIds.some((userDeviceId) => userDeviceId.toString() === device._id.toString()),
        ),
      })),
    })
  } catch (error) {
    console.error("[TankAccess] Error checking user tank access:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to check tank access",
      error: error.message,
    })
  }
}

/**
 * Get tanks that the current user has access to
 * GET /api/tank-types/user-accessible
 */
const getUserAccessibleTanks = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    console.log(`[UserTanks] Fetching accessible tanks for user: ${userId} (${userRole})`)

    let tanks = []

    if (userRole === "admin") {
      // Admin can see all tanks
      tanks = await TankType.find({})
        .populate("connectedDevices", "name serialNumber sensorType assignedTo")
        .sort({ createdAt: -1 })
    } else {
      // Regular users can only see tanks with their assigned devices
      const userDevices = await Device.find({ assignedTo: userId })
      const userDeviceIds = userDevices.map((device) => device._id)

      if (userDeviceIds.length > 0) {
        tanks = await TankType.find({
          connectedDevices: { $in: userDeviceIds },
        })
          .populate("connectedDevices", "name serialNumber sensorType assignedTo")
          .sort({ createdAt: -1 })

        // Filter connected devices to only show user's devices for regular users
        tanks = tanks.map((tank) => ({
          ...tank.toObject(),
          connectedDevices: tank.connectedDevices.filter((device) =>
            userDeviceIds.some((userDeviceId) => userDeviceId.toString() === device._id.toString()),
          ),
        }))
      }
    }

    console.log(`[UserTanks] Found ${tanks.length} accessible tanks for user`)

    return res.json({
      success: true,
      data: tanks,
      count: tanks.length,
      userRole: userRole,
    })
  } catch (error) {
    console.error("[UserTanks] Error fetching user accessible tanks:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch accessible tanks",
      error: error.message,
    })
  }
}

module.exports = {
  checkUserTankAccess,
  getUserAccessibleTanks,
}
