const mongoose = require("mongoose")
const { ErrorResponse } = require("../utils/errorResponse")
const asyncHandler = require("../middleware/asyncHandler")
const { getModels } = require("../utils/modelHelpers")
// Assuming these imports are correct based on your previous file
const { processSensorDataForAlerts, clearThresholdCache } = require("../services/alertGenerator")

// Helper function to dynamically get models
function getAlertModels() {
  try {
    return {
      Alert: mongoose.model("Alert"),
      Device: mongoose.model("Device"),
      TankType: mongoose.model("TankType"),
      User: mongoose.model("User"),
    }
  } catch (error) {
    console.error("❌ [AlertController] Error accessing models:", error.message)
    throw new Error("Database models not available for AlertController")
  }
}

/**
 * @desc Create a new alert (internal use, or by system/admin)
 * @param {object} alertData - Data for the alert.
 * @access Internal/Private
 */
const createAlert = async (alertData) => {
  const { Alert } = getAlertModels()
  try {
    const newAlert = await Alert.create(alertData)
    console.log(`✅ Alert created: ${newAlert.type} - ${newAlert.message}`)

    // Optionally, broadcast alert via WebSocket if available
    // NOTE: Your WebSocket server logic must still be filtered to avoid pushing global alerts to non-admin users.
    if (global.broadcastSystemAlert) {
      global.broadcastSystemAlert(newAlert.toObject())
    }
    return { success: true, data: newAlert }
  } catch (error) {
    console.error("❌ Error creating alert:", error.message)
    return { success: false, message: error.message }
  }
}

/**
 * @desc Get all alerts with filtering, sorting, and pagination
 * @route GET /api/alerts
 * @access Private/User, Admin, Technician
 */
const getAllAlerts = asyncHandler(async (req, res, next) => {
  const { Alert, Device, TankType } = getAlertModels()
  const {
    type,
    severity,
    status = "active", // Default to active alerts
    relatedEntityId,
    limit = 20,
    page = 1,
    sortBy = "timestamp",
    sortOrder = "desc",
    search,
    startDate, // NEW: startDate filter
    endDate, // NEW: endDate filter
  } = req.query

  const query = {}

  // 🎯 FIX: Role-based access control for alerts (with zero-result safety check)
  if (req.user.role === "user" || req.user.role === "technician") {
    const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id").lean()
    const userDeviceIds = userDevices.map((d) => d._id)

    const userTanks = await TankType.find({ createdBy: req.user._id }).select("_id").lean()
    const userTankIds = userTanks.map((t) => t._id)

    // Combine entity IDs for filtering
    const accessibleEntityIds = [...userDeviceIds, ...userTankIds, req.user._id]

    // 🚨 CRITICAL FIX: If user has no entities, force zero results
    if (accessibleEntityIds.length === 0) {
      query["_id"] = { $in: [] } // Impossible filter
    } else {
      query["relatedEntities.entityId"] = { $in: accessibleEntityIds }
    }
  }

  // Existing filters
  if (type) query.type = type
  if (severity) query.severity = severity
  if (status) query.status = status
  
  // NOTE: relatedEntityId filtering must be compatible with the role filter above
  if (relatedEntityId && mongoose.Types.ObjectId.isValid(relatedEntityId)) {
    // If a specific ID is requested, it overrides the list filter for that entity ID.
    // However, if the user has no access (due to the CRITICAL FIX above), this query will still return nothing.
    query["relatedEntities.entityId"] = relatedEntityId
  }

  // Add date range filtering for timestamp
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) {
      query.timestamp.$gte = new Date(startDate)
    }
    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      query.timestamp.$lte = endOfDay
    }
  }

  if (search) {
    query.$or = [
      { message: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
      { "relatedEntities.entityName": { $regex: search, $options: "i" } },
    ]
  }

  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
  const sortObj = {}
  sortObj[sortBy] = sortOrder === "desc" ? -1 : 1

  const totalCount = await Alert.countDocuments(query)
  const totalPages = Math.ceil(totalCount / Number.parseInt(limit))

  const alerts = await Alert.find(query).sort(sortObj).limit(Number.parseInt(limit)).skip(skip).lean()

  res.status(200).json({
    success: true,
    count: alerts.length,
    data: alerts,
    pagination: {
      currentPage: Number.parseInt(page),
      totalPages,
      totalCount,
      perPage: Number.parseInt(limit),
      hasNextPage: Number.parseInt(page) < totalPages,
      hasPrevPage: Number.parseInt(page) > 1,
    },
  })
})

/**
 * @desc Get single alert by ID
 * @route GET /api/alerts/:id
 * @access Private/User, Admin, Technician (if user has access)
 */
const getAlertById = asyncHandler(async (req, res, next) => {
  const { Alert, Device, TankType } = getAlertModels()
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorResponse("Invalid alert ID format", 400))
  }

  // Fetch alert details to check related entities
  const alert = await Alert.findById(id).lean()

  if (!alert) {
    return next(new ErrorResponse(`Alert not found with ID of ${id}`, 404))
  }

  // 🎯 FIX: Authorization check using the same logic for consistency
  if (req.user.role !== "admin") {
    let hasAccess = false
    
    // Efficiently gather all accessible entity IDs
    const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id").lean()
    const userDeviceIds = userDevices.map((d) => d._id.toString())

    const userTanks = await TankType.find({ createdBy: req.user._id }).select("_id").lean()
    const userTankIds = userTanks.map((t) => t._id.toString())
    
    const accessibleIds = new Set([...userDeviceIds, ...userTankIds, req.user._id.toString()]);
    
    // Check if any related entity is in the accessible set
    for (const entity of alert.relatedEntities) {
      if (accessibleIds.has(entity.entityId.toString())) {
        hasAccess = true;
        break;
      }
    }

    if (!hasAccess) {
      // Return 404 instead of 403 for security reasons (don't confirm the alert exists)
      return next(new ErrorResponse(`Alert not found with ID of ${id}`, 404)) 
    }
  }

  res.status(200).json({
    success: true,
    data: alert,
  })
})

/**
 * @desc Update alert status (e.g., acknowledge, resolve)
 * @route PUT /api/alerts/:id
 * @access Private/User, Admin, Technician
 */
const updateAlert = asyncHandler(async (req, res, next) => {
  const { Alert, Device, TankType } = getAlertModels()
  const { id } = req.params
  const { status, resolvedBy, resolvedAt, ...rest } = req.body 

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorResponse("Invalid alert ID format", 400))
  }

  const alert = await Alert.findById(id)

  if (!alert) {
    return next(new ErrorResponse(`Alert not found with ID of ${id}`, 404))
  }

  // 🎯 FIX: Authorization check using the more robust logic from getAlertById
  if (req.user.role !== "admin") {
    let hasAccess = false

    // Efficiently gather all accessible entity IDs
    const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id").lean()
    const userDeviceIds = userDevices.map((d) => d._id.toString())

    const userTanks = await TankType.find({ createdBy: req.user._id }).select("_id").lean()
    const userTankIds = userTanks.map((t) => t._id.toString())
    
    const accessibleIds = new Set([...userDeviceIds, ...userTankIds, req.user._id.toString()]);
    
    // Check if any related entity is in the accessible set
    for (const entity of alert.relatedEntities) {
      if (accessibleIds.has(entity.entityId.toString())) {
        hasAccess = true;
        break;
      }
    }

    if (!hasAccess) {
      return next(new ErrorResponse(`Not authorized to update alert ${id}`, 403))
    }
  }

  // Update status and set resolvedBy/At if status is 'resolved'
  if (status && ["active", "resolved", "acknowledged", "ignored"].includes(status)) {
    alert.status = status
    if (status === "resolved" && !alert.resolvedAt) {
      alert.resolvedAt = new Date()
      alert.resolvedBy = req.user._id // Set resolver to current user
    } else if (status !== "resolved") {
      alert.resolvedAt = null
      alert.resolvedBy = null
    }
  }

  // Allow admin to manually set resolvedBy/At
  if (req.user.role === "admin") {
    if (resolvedBy !== undefined) alert.resolvedBy = resolvedBy
    if (resolvedAt !== undefined) alert.resolvedAt = resolvedAt
  }

  // Apply other updates
  Object.assign(alert, rest)

  await alert.save()

  res.status(200).json({
    success: true,
    data: alert,
    message: "Alert updated successfully",
  })
})

/**
 * @desc Delete alert
 * @route DELETE /api/alerts/:id
 * @access Private/Admin
 */
const deleteAlert = asyncHandler(async (req, res, next) => {
  const { Alert } = getAlertModels()
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorResponse("Invalid alert ID format", 400))
  }

  const alert = await Alert.findById(id)

  if (!alert) {
    return next(new ErrorResponse(`Alert not found with ID of ${id}`, 404))
  }

  await alert.deleteOne() // Use deleteOne() for pre/post hooks

  res.status(200).json({
    success: true,
    data: {},
    message: "Alert deleted successfully",
  })
})

/**
 * @desc Get alert statistics
 * @route GET /api/alerts/stats
 * @access Private/Admin, User, Technician
 */
const getAlertStats = asyncHandler(async (req, res, next) => {
  const { Alert, Device, TankType } = getAlertModels()
  const { startDate, endDate } = req.query

  const matchQuery = {}

  // 🎯 FIX: Role-based access control for alerts stats (with zero-result safety check)
  if (req.user.role === "user" || req.user.role === "technician") {
    const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id").lean()
    const userDeviceIds = userDevices.map((d) => d._id)

    const userTanks = await TankType.find({ createdBy: req.user._id }).select("_id").lean()
    const userTankIds = userTanks.map((t) => t._id)

    // Combine entity IDs for filtering
    const accessibleEntityIds = [...userDeviceIds, ...userTankIds, req.user._id]
    
    // 🚨 CRITICAL FIX: If user has no entities, force zero results
    if (accessibleEntityIds.length === 0) {
        matchQuery["_id"] = { $in: [] }
    } else {
        matchQuery["relatedEntities.entityId"] = { $in: accessibleEntityIds }
    }
  }

  if (startDate || endDate) {
    matchQuery.timestamp = {}
    if (startDate) matchQuery.timestamp.$gte = new Date(startDate)
    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      matchQuery.timestamp.$lte = endOfDay
    }
  }

  const stats = await Alert.aggregate([
    { $match: matchQuery }, // Apply the filtered matchQuery
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        activeAlerts: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        resolvedAlerts: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        acknowledgedAlerts: { $sum: { $cond: [{ $eq: ["$status", "acknowledged"] }, 1, 0] } },
        criticalAlerts: { $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] } },
        highAlerts: { $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] } },
        mediumAlerts: { $sum: { $cond: [{ $eq: ["$severity", "medium"] }, 1, 0] } },
        lowAlerts: { $sum: { $cond: [{ $eq: ["$severity", "low"] }, 1, 0] } },
        alertsByType: { $push: "$type" },
        alertsBySeverity: { $push: "$severity" },
      },
    },
    {
      $project: {
        _id: 0,
        totalAlerts: 1,
        activeAlerts: 1,
        resolvedAlerts: 1,
        acknowledgedAlerts: 1,
        criticalAlerts: 1,
        highAlerts: 1,
        mediumAlerts: 1,
        lowAlerts: 1,
        // The arrays need to be processed on the client or in a separate aggregation step
        alertsByType: 1,
        alertsBySeverity: 1,
      },
    },
  ])

  res.status(200).json({
    success: true,
    data: stats[0] || {},
    timestamp: new Date().toISOString(),
  })
})

/**
 * @desc Get alerts trend over time (e.g., daily counts)
 * @route GET /api/alerts/trend
 * @access Private/Admin, User, Technician
 */
const getAlertsTrend = asyncHandler(async (req, res, next) => {
  const { Alert, Device, TankType } = getAlertModels()
  const { period = "24h", interval = "hour", type, severity } = req.query 

  let startDate
  let groupByFormat
  let timeUnit

  switch (period) {
    case "24h":
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      groupByFormat = "%Y-%m-%dT%H:00:00.000Z" 
      timeUnit = "hour"
      break
    case "7d":
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      groupByFormat = "%Y-%m-%d" 
      timeUnit = "day"
      break
    case "30d":
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      groupByFormat = "%Y-%m-%d" 
      timeUnit = "day"
      break
    default:
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      groupByFormat = "%Y-%m-%dT%H:00:00.000Z"
      timeUnit = "hour"
  }

  const matchQuery = {
    timestamp: { $gte: startDate },
  }

  // 🎯 FIX: Role-based access control for alerts trend (with zero-result safety check)
  if (req.user.role === "user" || req.user.role === "technician") {
    const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id").lean()
    const userDeviceIds = userDevices.map((d) => d._id)

    const userTanks = await TankType.find({ createdBy: req.user._id }).select("_id").lean()
    const userTankIds = userTanks.map((t) => t._id)

    const accessibleEntityIds = [...userDeviceIds, ...userTankIds, req.user._id]

    // 🚨 CRITICAL FIX: If user has no entities, force zero results
    if (accessibleEntityIds.length === 0) {
        matchQuery["_id"] = { $in: [] }
    } else {
        matchQuery["relatedEntities.entityId"] = { $in: accessibleEntityIds }
    }
  }

  if (type) matchQuery.type = type
  if (severity) matchQuery.severity = severity

  const trendData = await Alert.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupByFormat,
            date: "$timestamp",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])

  // Fill in missing time intervals with count 0 (logic remains correct)
  const filledTrendData = []
  const currentDate = new Date(startDate)
  currentDate.setMinutes(0, 0, 0) 

  while (currentDate.getTime() <= Date.now()) {
    let formattedDate
    if (timeUnit === "hour") {
      formattedDate = currentDate.toISOString().substring(0, 19) + ".000Z"
    } else {
      formattedDate = currentDate.toISOString().substring(0, 10)
    }

    const existingData = trendData.find((item) => item._id === formattedDate)
    filledTrendData.push({
      time: formattedDate,
      count: existingData ? existingData.count : 0,
    })

    if (timeUnit === "hour") {
      currentDate.setHours(currentDate.getHours() + 1)
    } else {
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  res.status(200).json({
    success: true,
    data: filledTrendData,
    period,
    interval: timeUnit,
    timestamp: new Date().toISOString(),
  })
})

/**
 * @desc Get device monitoring statistics
 * @route GET /api/alerts/device-stats
 * @access Private/Admin, User, Technician
 */
const getDeviceStats = asyncHandler(async (req, res, next) => {
  const { Device, TankType } = getAlertModels()

  const deviceQuery = {}
  const tankQuery = {}

  if (req.user.role === "user" || req.user.role === "technician") {
    // For regular users/technicians, only show stats for their assigned devices/tanks
    deviceQuery.assignedToUser = req.user._id
    tankQuery.createdBy = req.user._id
    
    // NOTE: This relies on the queries themselves returning 0 if no documents match
  }

  // Get device counts
  const totalDevices = await Device.countDocuments(deviceQuery)
  const activeDevices = await Device.countDocuments({ ...deviceQuery, status: "active" })
  const inactiveDevices = await Device.countDocuments({ ...deviceQuery, status: "inactive" })

  // Get tank counts
  const totalTanks = await TankType.countDocuments(tankQuery)

  res.status(200).json({
    success: true,
    data: {
      devicesMonitored: totalDevices,
      activeDevices,
      inactiveDevices,
      tanksMonitored: totalTanks,
    },
    timestamp: new Date().toISOString(),
  })
})

const processAlertsForDevice = async (req, res) => {
  try {
    const { deviceId } = req.params
    const { sensorData } = req.body

    if (!deviceId || !sensorData) {
      return res.status(400).json({
        success: false,
        message: "Device ID and sensor data are required",
      })
    }

    // Add deviceId to sensor data if not present
    const dataWithDeviceId = {
      ...sensorData,
      deviceId: deviceId,
    }

    const generatedAlerts = await processSensorDataForAlerts(dataWithDeviceId)

    res.status(200).json({
      success: true,
      message: `Generated ${generatedAlerts.length} alerts`,
      data: generatedAlerts,
    })
  } catch (error) {
    console.error("Error processing alerts for device:", error)
    res.status(500).json({
      success: false,
      message: "Failed to process alerts",
      error: error.message,
    })
  }
}

const clearAlertThresholdCache = async (req, res) => {
  try {
    clearThresholdCache()

    res.status(200).json({
      success: true,
      message: "Alert threshold cache cleared successfully",
    })
  } catch (error) {
    console.error("Error clearing threshold cache:", error)
    res.status(500).json({
      success: false,
      message: "Failed to clear threshold cache",
      error: error.message,
    })
  }
}

module.exports = {
  createAlert,
  getAllAlerts,
  getAlertById,
  updateAlert,
  deleteAlert,
  getAlertStats,
  getAlertsTrend,
  getDeviceStats, 
  processAlertsForDevice,
  clearAlertThresholdCache,
}