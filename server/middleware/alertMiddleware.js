// backend/middleware/alertMiddleware.js
const { processSensorDataForAlerts, clearThresholdCache } = require("../services/alertGenerator")

// Middleware to process sensor data for alerts
const processAlertsMiddleware = async (req, res, next) => {
  // Only process alerts for sensor data submissions
  if (req.method === "POST" && req.path.includes("/sensor/raw-data")) {
    try {
      // Get the sensor data from the request body
      const sensorData = req.body

      // Process the sensor data for alerts in the background
      // Don't wait for this to complete to avoid slowing down the response
      setImmediate(async () => {
        try {
          const alertResult = await processSensorDataForAlerts(sensorData)
          if (alertResult.length > 0) {
            console.log(`[AlertMiddleware] Generated ${alertResult.length} alerts for device ${sensorData.deviceId}`)
          }
        } catch (error) {
          console.error("[AlertMiddleware] Error processing alerts:", error)
          // If there's a persistent error, clear the cache and retry once
          if (error.message.includes("threshold") || error.message.includes("cache")) {
            console.log("[AlertMiddleware] Clearing threshold cache and retrying...")
            clearThresholdCache()
          }
        }
      })
    } catch (error) {
      console.error("[AlertMiddleware] Error in alert processing middleware:", error)
    }
  }

  next()
}

const clearCacheOnThresholdUpdate = (req, res, next) => {
  // Clear cache after threshold operations
  const originalSend = res.send
  res.send = function (data) {
    // Check if this was a successful threshold operation
    if (
      req.path.includes("/alert-threshold") &&
      (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") &&
      res.statusCode >= 200 &&
      res.statusCode < 300
    ) {
      console.log("[AlertMiddleware] Clearing threshold cache after threshold update")
      clearThresholdCache()
    }
    originalSend.call(this, data)
  }
  next()
}

module.exports = {
  processAlertsMiddleware,
  clearCacheOnThresholdUpdate,
}
