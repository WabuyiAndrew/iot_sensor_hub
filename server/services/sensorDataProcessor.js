// backend/services/sensorDataProcessor.js
const { processSensorDataForAlerts } = require("./alertGenerator")

// Process incoming sensor data and generate alerts
const processSensorData = async (sensorData, deviceInfo = null) => {
  try {
    console.log(`[SensorDataProcessor] Processing sensor data for device: ${sensorData.deviceId}`)

    // Generate alerts based on configurable thresholds
    const generatedAlerts = await processSensorDataForAlerts(sensorData, deviceInfo)

    if (generatedAlerts.length > 0) {
      console.log(`[SensorDataProcessor] Generated ${generatedAlerts.length} alerts for device ${sensorData.deviceId}`)

      // Create summary of generated alerts
      const alertSummary = generatedAlerts.map((alert) => ({
        type: alert.type,
        severity: alert.severity,
        parameter: alert.data.parameter,
        value: alert.data.value,
        message: alert.message,
      }))

      // Here you could add additional processing like:
      // - Sending notifications
      // - Triggering webhooks
      // - Logging to external systems

      return {
        success: true,
        alertsGenerated: generatedAlerts.length,
        alerts: generatedAlerts,
        summary: alertSummary,
      }
    }

    return {
      success: true,
      alertsGenerated: 0,
      alerts: [],
      summary: [],
    }
  } catch (error) {
    console.error("[SensorDataProcessor] Error processing sensor data:", error)
    return {
      success: false,
      error: error.message,
      alertsGenerated: 0,
      alerts: [],
      summary: [],
    }
  }
}

module.exports = {
  processSensorData,
}
