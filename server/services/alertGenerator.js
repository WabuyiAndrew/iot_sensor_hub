// backend/services/alertGenerator.js
const AlertThreshold = require("../models/AlertThreshold")
const Alert = require("../models/Alert")
const Device = require("../models/Device")

// Cache for thresholds to avoid frequent database queries
const thresholdCache = new Map()
let lastCacheUpdate = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Load thresholds into cache
const loadThresholds = async () => {
  try {
    const now = Date.now()
    if (now - lastCacheUpdate < CACHE_DURATION && thresholdCache.size > 0) {
      return // Use cached thresholds
    }

    const thresholds = await AlertThreshold.find({ isActive: true }).lean()
    thresholdCache.clear()

    thresholds.forEach((threshold) => {
      thresholdCache.set(threshold.parameter, threshold)
    })

    lastCacheUpdate = now
    console.log(`[AlertGenerator] Loaded ${thresholds.length} active thresholds into cache`)
  } catch (error) {
    console.error("[AlertGenerator] Error loading thresholds:", error)
  }
}

// Check if a value exceeds threshold
const checkThreshold = (value, threshold) => {
  if (!threshold || value === null || value === undefined) {
    return { exceeded: false, severity: null }
  }

  const { warningThreshold, criticalThreshold, thresholdType } = threshold

  let warningExceeded = false
  let criticalExceeded = false

  switch (thresholdType) {
    case "greater_than":
      warningExceeded = value > warningThreshold
      criticalExceeded = value > criticalThreshold
      break
    case "less_than":
      warningExceeded = value < warningThreshold
      criticalExceeded = value < criticalThreshold
      break
    case "equals":
      warningExceeded = value === warningThreshold
      criticalExceeded = value === criticalThreshold
      break
    case "not_equals":
      warningExceeded = value !== warningThreshold
      criticalExceeded = value !== criticalThreshold
      break
    default:
      return { exceeded: false, severity: null }
  }

  if (criticalExceeded) {
    return { exceeded: true, severity: "critical" }
  } else if (warningExceeded) {
    return { exceeded: true, severity: "high" }
  }

  return { exceeded: false, severity: null }
}

// Generate alert message
const generateAlertMessage = (parameter, value, threshold, severity) => {
  const { unit, thresholdType } = threshold
  const thresholdValue = severity === "critical" ? threshold.criticalThreshold : threshold.warningThreshold

  const operatorText =
    {
      greater_than: "exceeded",
      less_than: "dropped below",
      equals: "equals",
      not_equals: "does not equal",
    }[thresholdType] || "exceeded"

  return `${parameter.toUpperCase()} ${operatorText} ${severity} threshold: ${value}${unit} (threshold: ${thresholdValue}${unit})`
}

// Process sensor data and generate alerts
const processSensorDataForAlerts = async (sensorData, deviceInfo = null) => {
  try {
    // Load thresholds if cache is stale
    await loadThresholds()

    if (thresholdCache.size === 0) {
      console.log("[AlertGenerator] No active thresholds found")
      return []
    }

    // Get device info if not provided
    let device = deviceInfo
    if (!device && sensorData.deviceId) {
      device = await Device.findById(sensorData.deviceId).populate("assignedToUser").lean()
    }

    if (!device) {
      console.warn("[AlertGenerator] Device not found for sensor data")
      return []
    }

    const generatedAlerts = []
    const processedParameters = []

    // Check each parameter in sensor data against thresholds
    for (const [parameter, value] of Object.entries(sensorData)) {
      // Skip non-sensor parameters
      if (["_id", "deviceId", "timestamp", "createdAt", "updatedAt", "__v"].includes(parameter)) {
        continue
      }

      // Skip null or undefined values
      if (value === null || value === undefined) {
        continue
      }

      const threshold = thresholdCache.get(parameter)
      if (!threshold) {
        continue // No threshold configured for this parameter
      }

      processedParameters.push(parameter)

      const thresholdCheck = checkThreshold(value, threshold)
      if (!thresholdCheck.exceeded) {
        continue // Threshold not exceeded
      }

      // Check if similar alert already exists and is active
      const existingAlert = await Alert.findOne({
        deviceId: device._id,
        type: `${parameter}_${thresholdCheck.severity}`,
        status: "active",
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Within last hour
      })

      if (existingAlert) {
        console.log(`[AlertGenerator] Similar alert already exists for ${parameter} on device ${device.name}`)
        continue
      }

      // Generate alert
      const alertMessage = generateAlertMessage(parameter, value, threshold, thresholdCheck.severity)

      const newAlert = new Alert({
        deviceId: device._id,
        userId: device.assignedToUser ? device.assignedToUser._id : null,
        type: `${parameter}_${thresholdCheck.severity}`,
        severity: thresholdCheck.severity,
        message: alertMessage,
        status: "active",
        data: {
          parameter,
          value,
          threshold: {
            warning: threshold.warningThreshold,
            critical: threshold.criticalThreshold,
            type: threshold.thresholdType,
            unit: threshold.unit,
          },
          deviceName: device.name,
          deviceSerialNumber: device.serialNumber,
          timestamp: sensorData.timestamp || new Date(),
        },
      })

      await newAlert.save()
      generatedAlerts.push(newAlert)

      console.log(
        `[AlertGenerator] Generated ${thresholdCheck.severity} alert for ${parameter} on device ${device.name}: ${value}${threshold.unit}`,
      )
    }

    // Log processing summary
    console.log(
      `[AlertGenerator] Processed ${processedParameters.length} parameters, generated ${generatedAlerts.length} alerts for device ${device.name}`,
    )

    return generatedAlerts
  } catch (error) {
    console.error("[AlertGenerator] Error processing sensor data for alerts:", error)
    return []
  }
}

// Clear threshold cache (useful when thresholds are updated)
const clearThresholdCache = () => {
  thresholdCache.clear()
  lastCacheUpdate = 0
  console.log("[AlertGenerator] Threshold cache cleared")
}

// Get cached thresholds (for debugging)
const getCachedThresholds = () => {
  return Array.from(thresholdCache.entries())
}

module.exports = {
  processSensorDataForAlerts,
  clearThresholdCache,
  getCachedThresholds,
  loadThresholds,
}
