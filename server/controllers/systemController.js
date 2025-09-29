// controllers/systemController.js
const mongoose = require("mongoose");
const asyncHandler = require("../middleware/asyncHandler");
const { getModels } = require("../utils/modelHelpers");

/**
 * @desc Get system-wide statistics
 * @route GET /api/system/stats
 * @access Private/Admin
 */
const getSystemStats = asyncHandler(async (req, res, next) => {
  const { User, Device, SensorData, Alert, TankType, TankVolumeHistory } = getModels();

  try {
    // 1. User Statistics
    const userStats = await User.getUserStats(); // Assuming this static method exists

    // 2. Device Statistics
    const deviceStats = await Device.getDeviceStats(); // Assuming this static method exists

    // 3. Sensor Data Statistics (overall)
    const sensorDataStats = await SensorData.getSensorDataStats(); // Overall stats from SensorData model

    // 4. Alert Statistics (overall active alerts)
    const alertStats = await Alert.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalActiveAlerts: { $sum: 1 },
          criticalActiveAlerts: { $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] } },
          highActiveAlerts: { $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] } },
        },
      },
    ]);

    // 5. Tank Statistics
    const tankStats = await TankType.getTankStatistics(); // Assuming this static method exists

    // 6. Recent Data Ingestion Rate (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentSensorReadings = await SensorData.countDocuments({
      timestamp: { $gte: fiveMinutesAgo },
    });
    const recentDevicesWithData = await SensorData.distinct("deviceId", {
      timestamp: { $gte: fiveMinutesAgo },
    });

    // Combine all statistics
    const combinedStats = {
      totalUsers: userStats[0]?.totalUsers || 0,
      activeUsers: userStats[0]?.activeUsers || 0,
      totalDevices: deviceStats[0]?.totalDevices || 0,
      onlineDevices: deviceStats[0]?.onlineDevices || 0,
      offlineDevices: deviceStats[0]?.offlineDevices || 0,
      totalTanks: tankStats[0]?.totalTanks || 0,
      totalCapacityLiters: tankStats[0]?.totalCapacity || 0,
      totalCurrentVolumeLiters: tankStats[0]?.totalCurrentVolume || 0,
      totalRawReadings: sensorDataStats[0]?.totalReadings || 0, // Total readings ever or within a period
      uniqueDeviceCount: sensorDataStats[0]?.uniqueDeviceCount || 0, // Devices that sent data
      uniqueSensorTypeCount: sensorDataStats[0]?.uniqueSensorTypeCount || 0,
      errorRate: sensorDataStats[0]?.errorRate || 0, // Overall sensor data error rate
      activeAlerts: alertStats[0]?.totalActiveAlerts || 0,
      criticalAlerts: alertStats[0]?.criticalActiveAlerts || 0,
      highAlerts: alertStats[0]?.highActiveAlerts || 0,
      ingestionRateLast5Min: recentSensorReadings / 5, // Readings per minute
      activeDevicesLast5Min: recentDevicesWithData.length,
      // Add more as needed
    };

    res.status(200).json({
      success: true,
      data: combinedStats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ [SystemController] Error fetching system stats:", error.message);
    next(new ErrorResponse("Failed to fetch system statistics", 500));
  }
});

/**
 * @desc Get system health status (simplified for mock replacement)
 * @route GET /api/system/health
 * @access Private/Admin
 */
const getSystemHealth = asyncHandler(async (req, res, next) => {
  // In a real scenario, this would involve checking actual service health,
  // database connections, memory usage, CPU load, etc.
  // For now, we'll provide a simplified mock-like response based on general system status.

  const { SensorData } = getModels();

  // Check if any data has been ingested recently to infer system activity
  const last10Minutes = new Date(Date.now() - 10 * 60 * 1000);
  const recentDataCount = await SensorData.countDocuments({ timestamp: { $gte: last10Minutes } });

  let status = "healthy";
  let message = "All core services are operational.";

  if (recentDataCount < 5) { // Arbitrary threshold for "low activity"
    status = "degraded";
    message = "Low data ingestion activity detected in the last 10 minutes.";
  }
  if (recentDataCount === 0) {
    status = "unhealthy";
    message = "No data ingested in the last 10 minutes. Potential ingestion pipeline issue.";
  }

  // Simulate some dynamic values for health
  const uptimeSeconds = Math.floor(Math.random() * 86400 * 7) + 3600; // 1 hour to 7 days
  const heapUsedMB = Math.floor(Math.random() * 500) + 100; // 100-600 MB
  const heapTotalMB = Math.floor(Math.random() * 200) + 800; // 800-1000 MB

  const healthData = {
    status: status,
    message: message,
    uptime: uptimeSeconds,
    memory: {
      heapUsed: heapUsedMB * 1024 * 1024, // Convert MB to bytes
      heapTotal: heapTotalMB * 1024 * 1024,
      rss: (heapUsedMB + Math.floor(Math.random() * 100)) * 1024 * 1024,
    },
    services: {
      database: {
        status: Math.random() > 0.1 ? "healthy" : "unhealthy",
        responseTime: Math.floor(Math.random() * 50) + 10,
      },
      websocket: {
        status: Math.random() > 0.05 ? "healthy" : "unhealthy",
        connections: Math.floor(Math.random() * 100) + 20,
      },
      api: {
        status: Math.random() > 0.08 ? "healthy" : "unhealthy",
        responseTime: Math.floor(Math.random() * 100) + 20,
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.status(200).json({
    success: true,
    data: healthData,
  });
});


module.exports = {
  getSystemStats,
  getSystemHealth,
};
