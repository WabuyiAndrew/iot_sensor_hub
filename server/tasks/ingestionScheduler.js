const cron = require("node-cron")
const winston = require("winston")
const SensorData = require("../models/SensorData")
const Analytics = require("../models/Analytics")
const Device = require("../models/Device")
const fetch = require("node-fetch")

// Try to import external API service with fallback
let externalApiService = null
try {
  externalApiService = require("../services/externalApiService")
} catch (error) {
  console.warn("⚠️ [Scheduler] External API service not available:", error.message)
}

// Setup logger for scheduler
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
          return `${timestamp} ${level}: ${message}${metaStr}`
        }),
      ),
    }),
  ],
})

// Keep track of running jobs
const scheduledJobs = new Map()
let isSchedulerRunning = false
let isIngestionJobRunning = false
let isDeviceStatusSyncRunning = false // New flag to prevent concurrent device status sync jobs

/**
 * Helper function to parse numeric values from strings with units
 * @param {string|number} value - The value to parse (e.g., "22.0 °C", "99.9 %RH", 22.5)
 * @returns {number|null} - The parsed numeric value or null if invalid
 */
function parseNumericValue(value) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    // Extract numeric part from strings like "22.0 °C", "99.9 %RH", "48.0 ug/m³"
    const numericMatch = value.match(/^(-?\d+\.?\d*)/)
    if (numericMatch) {
      const parsed = Number.parseFloat(numericMatch[1])
      return isNaN(parsed) ? null : parsed
    }
  }

  return null
}

/**
 * Maps the raw data from the external API to match the local SensorData schema.
 * @param {Object} rawDataPoint - A single data point from the external API.
 * @param {String} deviceId - The local MongoDB _id for the device.
 * @param {String} deviceSerialNumber - The device serial number from local database.
 * @returns {Object} The mapped data point ready to be saved.
 */
function mapExternalDataToLocalSchema(rawDataPoint, deviceId, deviceSerialNumber) {
  const parsedData = {}

  // Parse all data fields that might contain units
  if (rawDataPoint.data) {
    Object.keys(rawDataPoint.data).forEach((key) => {
      const value = rawDataPoint.data[key]

      // Fields that should be numbers in the schema
      const numericFields = [
        "temperature",
        "humidity",
        "atmosphericPressure",
        "pm25",
        "pm10",
        "windSpeed",
        "windDir",
        "rainfall",
        "totalSolarRadiation",
        "level",
        "signalStrength",
        "errorCode",
        "versionNumber",
        
      ]

      if (numericFields.includes(key)) {
        const parsed = parseNumericValue(value)
        parsedData[key] = parsed !== null ? parsed : value // Keep original if parsing fails
      } else {
        parsedData[key] = value // Keep non-numeric fields as-is
      }
    })
  }

  const mappedData = {
    deviceId: deviceId, // MongoDB ObjectId reference to Device
    sensorId: deviceSerialNumber, // Use local device serial number for consistency
    timestamp: new Date(rawDataPoint.dateCreated || rawDataPoint.timestamp || new Date()),
    ...parsedData, // Spread parsed sensor readings
    createdAt: new Date(), // Always use current time for createdAt
  }

  return mappedData
}

/**
 * Sync device status from external API and update local database
 * This function fetches the current status of all devices from the external API
 * and updates the local Device records to cache this information
 */
const syncDeviceStatusFromExternalAPI = async () => {
  // Check if device status sync should be skipped
  if (process.env.SKIP_DEVICE_STATUS_SYNC === 'true') {
    console.log("⚠️ [Scheduler] Device status sync is disabled via environment variable")
    return
  }

  // Prevent concurrent runs
  if (isDeviceStatusSyncRunning) {
    console.log("⚠️ [Scheduler] Device status sync is already running, skipping this run.".yellow)
    return
  }
  isDeviceStatusSyncRunning = true

  try {
    console.log("🔄 [Scheduler] Starting device status synchronization...")
    const startTime = Date.now()

    // Step 1: Get all devices from local database
    const localDevices = await Device.find({})
      .select("_id serialNumber name type status lastSeen")
      .lean()
      .maxTimeMS(10000)

    if (localDevices.length === 0) {
      console.log("⚠️ [Scheduler] No devices found in local database")
      return
    }

    console.log(`🔍 [Scheduler] Found ${localDevices.length} devices to check status for`)

    // Step 2: Prepare device parameters for API call
    const deviceSerialNumbers = localDevices.map((device) => device.serialNumber)
    const devicesParam = deviceSerialNumbers.join(",")

    console.log(`📡 [Scheduler] Requesting status for devices: ${devicesParam}`)

    // Step 3: Call external API to get device status
    let deviceStatusData = []
    const maxRetries = 3
    let fetchSuccess = false

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

        console.log(`🔗 [Scheduler] Attempt ${attempt}/${maxRetries}: Calling external API...`)

        const apiUrl = `http://188.166.125.28/nkusu-iot/api/nkusu-iot/status?devices=${devicesParam}`
        console.log(`🔗 [Scheduler] API URL: ${apiUrl}`)

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "IoT-Scheduler/1.0",
          },
          signal: controller.signal,
          redirect: "manual", // Prevent automatic redirects from HTTP to HTTPS
          // No agent needed for HTTP requests
        })

        clearTimeout(timeoutId) // Clear timeout if request completes

        console.log(`📊 [Scheduler] API Response: ${response.status} ${response.ok ? "✅" : "❌"}`)

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location")
          console.log(`🔄 [Scheduler] Redirect detected to: ${location}`)

          // Server is forcing HTTPS redirects, but we want to stay on HTTP
          console.log(`⚠️ [Scheduler] Server is forcing HTTPS redirect, but HTTP-only mode is enabled`)
          console.log(`💡 [Scheduler] Consider setting SKIP_DEVICE_STATUS_SYNC=true to disable status sync`)
          throw new Error(`HTTP-only mode enabled but server requires HTTPS. Redirect to: ${location}`)
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unable to read error response")
          throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText.substring(0, 200)}`)
        }

        const responseText = await response.text()
        console.log(`📄 [Scheduler] Response body length: ${responseText.length} characters`)

        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error(`❌ [Scheduler] JSON Parse Error: ${parseError.message}`)
          console.error(`📄 [Scheduler] Response preview: ${responseText.substring(0, 500)}...`)
          throw new Error(
            `Invalid JSON response: ${parseError.message}. Response: ${responseText.substring(0, 200)}...`,
          )
        }

        deviceStatusData = Array.isArray(data) ? data : data.data || data || []
        console.log(`✅ [Scheduler] Successfully parsed ${deviceStatusData.length} device status records`)
        fetchSuccess = true
        break
      } catch (error) {
        const errorMessage = error.name === "AbortError" ? "Request timeout (15s)" : error.message

        console.error(`❌ [Scheduler] Fetch error details:`)
        console.error(`   - Error type: ${error.name}`)
        console.error(`   - Error message: ${errorMessage}`)
        console.error(`   - Attempt: ${attempt}/${maxRetries}`)

        if (error.cause) {
          console.error(`   - Underlying cause: ${error.cause}`)
        }

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1)
          console.warn(
            `⚠️ [Scheduler] Device status fetch failed (Attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying in ${delay}ms...`,
          )
          await new Promise((res) => setTimeout(res, delay))
        } else {
          console.error(`❌ [Scheduler] Failed to fetch device status after ${maxRetries} attempts: ${errorMessage}`)
          console.log(`💡 [Scheduler] Tip: If the server only supports HTTPS, set SKIP_DEVICE_STATUS_SYNC=true to disable this feature`)

          try {
            console.log(`🔍 [Scheduler] Testing basic connectivity to API host...`)
            const testController = new AbortController()
            const testTimeoutId = setTimeout(() => testController.abort(), 5000)

            const testResponse = await fetch("http://188.166.125.28/", {
              method: "HEAD",
              signal: testController.signal,
              redirect: "manual", // Prevent redirects in connectivity test
            })

            clearTimeout(testTimeoutId)
            console.log(
              `🌐 [Scheduler] Host connectivity test: ${testResponse.status} (${testResponse.ok ? "OK" : "Failed"})`,
            )
          } catch (testError) {
            console.error(`🌐 [Scheduler] Host connectivity test failed: ${testError.message}`)
          }
        }
      }
    }

    if (!fetchSuccess) {
      console.log("⚠️ [Scheduler] Could not fetch device status from external API")
      console.log("💡 [Scheduler] Device status sync will be skipped. Individual device data fetching will continue.")
      console.log("💡 [Scheduler] To disable status sync entirely, set environment variable: SKIP_DEVICE_STATUS_SYNC=true")

      // Don't mark all devices as unknown, just update the lastStatusCheck
      await Device.updateMany({}, { lastStatusCheck: new Date() })
      return
    }

    console.log(`✅ [Scheduler] Successfully fetched status for ${deviceStatusData.length} devices from external API`)

    // Step 4: Process the status data and update local database
    let devicesUpdated = 0
    let devicesUnchanged = 0
    let devicesNotFound = 0

    const statusMap = new Map()
    deviceStatusData.forEach((statusEntry) => {
      if (statusEntry.deviceNumber) {
        statusMap.set(statusEntry.deviceNumber, {
          status: statusEntry.status === "ON" ? "online" : statusEntry.status === "OFF" ? "offline" : "unknown",
          lastSeen: new Date(), // API doesn't provide lastSeen, use current time
          batteryLevel: statusEntry.batteryLevel,
          signalStrength: statusEntry.signalStrength,
          firmware: statusEntry.firmware || statusEntry.firmwareVersion,
          location: statusEntry.location,
        })
      }
    })

    for (const device of localDevices) {
      try {
        const externalStatus = statusMap.get(device.serialNumber)

        if (externalStatus) {
          const updateData = {
            status: externalStatus.status,
            lastStatusCheck: new Date(),
            lastSeen: externalStatus.lastSeen,
          }

          if (externalStatus.batteryLevel !== undefined) {
            updateData.batteryLevel = externalStatus.batteryLevel
          }
          if (externalStatus.signalStrength !== undefined) {
            updateData.signalStrength = externalStatus.signalStrength
          }
          if (externalStatus.firmware) {
            updateData.firmware = externalStatus.firmware
          }
          if (externalStatus.location) {
            updateData.location = externalStatus.location
          }

          if (device.status !== externalStatus.status) {
            await Device.findByIdAndUpdate(device._id, updateData)
            devicesUpdated++
            console.log(
              `📝 [Scheduler] Updated device ${device.name} (${device.serialNumber}) status: ${device.status} -> ${externalStatus.status}`,
            )
          } else {
            await Device.findByIdAndUpdate(device._id, { lastStatusCheck: new Date() })
            devicesUnchanged++
          }
        } else {
          devicesNotFound++
          await Device.findByIdAndUpdate(device._id, {
            status: "offline",
            lastStatusCheck: new Date(),
          })
          console.log(
            `⚠️ [Scheduler] Device ${device.name} (${device.serialNumber}) not found in external API, marking as offline`,
          )
        }
      } catch (updateError) {
        console.error(`❌ [Scheduler] Error updating device ${device.serialNumber}:`, updateError.message)
      }
    }

    const processingTimeMs = (Date.now() - startTime).toFixed(0)
    console.log(`✅ [Scheduler] Device status sync completed:`)
    console.log(`\t- Total devices checked: ${localDevices.length}`)
    console.log(`\t- Devices updated: ${devicesUpdated}`)
    console.log(`\t- Devices unchanged: ${devicesUnchanged}`)
    console.log(`\t- Devices not found in API: ${devicesNotFound}`)
    console.log(`\t- Processing time: ${processingTimeMs}ms`)

    logger.info("Device status sync completed", {
      totalDevices: localDevices.length,
      devicesUpdated,
      devicesUnchanged,
      devicesNotFound,
      processingTimeMs,
    })
  } catch (error) {
    logger.error("Device status sync failed", { error: error.message })
    console.error("❌ [Scheduler] Device status sync error:", error.message)
    console.error("❌ [Scheduler] Full error stack:", error.stack)
  } finally {
    isDeviceStatusSyncRunning = false
  }
}

const fetchAndDistributeRawData = async () => {
  if (!externalApiService) {
    console.warn("⚠️ [Scheduler] External API service not available, skipping data fetch".yellow)
    return
  }

  if (isIngestionJobRunning) {
    console.log("⚠️ [Scheduler] Ingestion job is already running, skipping this run.".yellow)
    return
  }
  isIngestionJobRunning = true

  try {
    console.log("🔄 [Scheduler] Starting bulk data fetch and distribution...")
    const startTime = Date.now()

    const localDevices = await Device.find({}).select("_id serialNumber name type status").lean().maxTimeMS(10000)

    if (localDevices.length === 0) {
      console.log("⚠️ [Scheduler] No devices found in local database")
      isIngestionJobRunning = false
      return
    }

    console.log(`🔍 [Scheduler] Found ${localDevices.length} local devices:`)
    localDevices.forEach((device, index) => {
      console.log(`   ${index + 1}. Serial: ${device.serialNumber}, Name: ${device.name}, Status: ${device.status}`)
    })

    let totalInserted = 0
    let totalDuplicates = 0
    let totalInvalidTimestamps = 0
    let devicesProcessed = 0
    let devicesWithNewData = 0
    let processingErrors = 0
    const maxRetries = 3

    for (const device of localDevices) {
      devicesProcessed++

      const latestRecord = await SensorData.findOne({ sensorId: device.serialNumber }).sort({
        timestamp: -1,
      })
      const lastTimestamp = latestRecord ? latestRecord.timestamp : null

      console.log(`🔄 [Scheduler] Processing data for device: ${device.name} (${device.serialNumber})`)
      console.log(`\t- Last recorded timestamp: ${lastTimestamp ? lastTimestamp.toISOString() : "None"}`)

      let rawRecords = []
      let fetchSuccess = false

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const externalApiResponse = await externalApiService.getSensorData({
            deviceId: device.serialNumber,
            size: 500,
            page: 0,
          })
          rawRecords = externalApiResponse.data.content || []
          fetchSuccess = true
          break
        } catch (err) {
          if (attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt - 1)
            console.warn(
              `⚠️ [Scheduler] Fetch failed for ${device.serialNumber} (Attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${delay}ms...`,
            )
            await new Promise((res) => setTimeout(res, delay))
          } else {
            console.error(
              `❌ [Scheduler] Failed to fetch data for device ${device.serialNumber} after ${maxRetries} attempts: ${err.message}`,
            )
            processingErrors++
          }
        }
      }

      if (!fetchSuccess) {
        console.log(`⚠️ [Scheduler] Data fetch failed for device ${device.serialNumber}. Status unchanged.`)
        await Device.findByIdAndUpdate(device._id, { lastSeen: new Date() })
        continue
      }

      console.log(`✅ [Scheduler] Fetch for device ${device.serialNumber} succeeded. Updating lastSeen.`)
      await Device.findByIdAndUpdate(device._id, { lastSeen: new Date() })

      if (rawRecords.length > 0) {
        const newestExternalTimestamp = new Date(rawRecords[0].timestamp || rawRecords[0].dateCreated)
        console.log(`\t- Newest record from external API: ${newestExternalTimestamp.toISOString()}`)
      }

      console.log(
        `📄 [Scheduler] Fetched ${rawRecords.length} potential new records from external API for device: ${device.serialNumber}`,
      )

      const newerRecords = rawRecords.filter((record) => {
        const recordTimestamp = new Date(record.timestamp || record.dateCreated)
        if (isNaN(recordTimestamp.getTime())) {
          totalInvalidTimestamps++
          console.warn(
            `⚠️ [Scheduler] Skipping record for ${device.serialNumber} due to invalid timestamp: ${record.timestamp || record.dateCreated}`,
          )
          return false
        }

        if (record.deviceNumber !== device.serialNumber) {
          return false
        }

        if (!lastTimestamp) {
          return true
        }

        return recordTimestamp.getTime() > lastTimestamp.getTime()
      })

      const recordsToInsert = []
      if (newerRecords.length > 0) {
        const existingTimestamps = await SensorData.find(
          {
            sensorId: device.serialNumber,
            timestamp: { $in: newerRecords.map((r) => new Date(r.timestamp || r.dateCreated)) },
          },
          { timestamp: 1 },
        )
        const existingTimestampsSet = new Set(existingTimestamps.map((r) => r.timestamp.toISOString()))

        for (const record of newerRecords) {
          const recordDate = new Date(record.timestamp || record.dateCreated)

          if (!existingTimestampsSet.has(recordDate.toISOString())) {
            recordsToInsert.push(mapExternalDataToLocalSchema(record, device._id, device.serialNumber))
          } else {
            totalDuplicates++
          }
        }
      }

      if (recordsToInsert.length > 0) {
        await SensorData.insertMany(recordsToInsert)
        totalInserted += recordsToInsert.length
        devicesWithNewData++
        console.log(
          `✅ [Scheduler] Ingestion for ${device.serialNumber}: Inserted ${recordsToInsert.length} new records.`,
        )
      } else {
        console.log(`⚠️ [Scheduler] Ingestion for ${device.serialNumber}: No new records to insert.`)
      }
    }

    const processingTimeMs = (Date.now() - startTime).toFixed(0)
    console.log(`✅ [Scheduler] Bulk ingestion completed:`)
    console.log(`\t- Total records inserted: ${totalInserted}`)
    console.log(`\t- Total duplicates skipped: ${totalDuplicates}`)
    console.log(`\t- Total invalid timestamps skipped: ${totalInvalidTimestamps}`)
    console.log(`\t- Devices processed: ${devicesProcessed}`)
    console.log(`\t- Devices with new data: ${devicesWithNewData}`)
    console.log(`\t- Processing errors: ${processingErrors}`)
    console.log(`\t- Processing time: ${processingTimeMs}ms`)

    logger.info("Bulk data ingestion completed", {
      totalInserted,
      totalDuplicates,
      devicesProcessed,
      devicesWithNewData,
      processingTimeMs,
    })
  } catch (error) {
    logger.error("Bulk data fetch and distribution failed", { error: error.message })
    console.error("❌ [Scheduler] Bulk ingestion error:", error.message)
  } finally {
    isIngestionJobRunning = false
  }
}

const processRawSensorData = async () => {
  try {
    logger.info("Starting raw sensor data processing")
    console.log("📊 [Scheduler] Processing raw sensor data...".cyan)

    const latestAnalytics = await Analytics.findOne()
      .sort({ timestamp: -1 })
      .select("timestamp")
      .lean()
      .maxTimeMS(10000)

    const fromDate =
      latestAnalytics && latestAnalytics.timestamp
        ? new Date(latestAnalytics.timestamp.getTime() + 1)
        : new Date(Date.now() - 24 * 60 * 60 * 1000)

    const unprocessedData = await SensorData.find({
      timestamp: { $gte: fromDate },
      createdAt: { $lte: new Date() },
    })
      .sort({ timestamp: 1 })
      .limit(1000)
      .lean()
      .maxTimeMS(15000)

    if (unprocessedData.length === 0) {
      console.log("📊 [Scheduler] No new sensor data to process".gray)
      return
    }

    console.log(`📊 [Scheduler] Processing ${unprocessedData.length} sensor readings...`.blue)

    const deviceGroups = {}

    unprocessedData.forEach((reading) => {
      if (!deviceGroups[reading.deviceId]) {
        deviceGroups[reading.deviceId] = []
      }
      deviceGroups[reading.deviceId].push(reading)
    })

    let processedCount = 0

    for (const [deviceId, readings] of Object.entries(deviceGroups)) {
      try {
        const device = await Device.findById(deviceId)
          .select("name type serialNumber assignedToUser")
          .lean()
          .maxTimeMS(8000)

        if (!device) {
          logger.warn("Device not found during processing", { deviceId })
          continue
        }

        for (const reading of readings) {
          const analyticsData = {
            deviceId: reading.deviceId,
            deviceType: device.type,
            timestamp: reading.timestamp,
            rawData: reading,
            metrics: {},
          }

          if (reading.temperature !== undefined) {
            analyticsData.metrics.temperature = {
              value: reading.temperature,
              unit: "celsius",
              quality: reading.temperature_quality || "good",
            }
          }

          if (reading.humidity !== undefined) {
            analyticsData.metrics.humidity = {
              value: reading.humidity,
              unit: "percentage",
              quality: reading.humidity_quality || "good",
            }
          }

          if (reading.atmosphericPressure !== undefined) {
            analyticsData.metrics.pressure = {
              value: reading.atmosphericPressure,
              unit: "mbar",
              quality: reading.pressure_quality || "good",
            }
          }

          if (reading.pm25 !== undefined) {
            analyticsData.metrics.pm25 = {
              value: reading.pm25,
              unit: "ug/m³",
              quality: reading.pm25_quality || "good",
            }
          }

          if (reading.pm10 !== undefined) {
            analyticsData.metrics.pm10 = {
              value: reading.pm10,
              unit: "ug/m³",
              quality: reading.pm10_quality || "good",
            }
          }

          if (reading.windSpeed !== undefined) {
            analyticsData.metrics.windSpeed = {
              value: reading.windSpeed,
              unit: "m/s",
              quality: reading.wind_quality || "good",
            }
          }

          if (reading.windDir !== undefined) {
            analyticsData.metrics.windDirection = {
              value: reading.windDir,
              unit: "degrees",
              quality: reading.wind_quality || "good",
            }
          }

          if (reading.rainfall !== undefined) {
            analyticsData.metrics.rainfall = {
              value: reading.rainfall,
              unit: "mm",
              quality: reading.rain_quality || "good",
            }
          }

          if (reading.totalSolarRadiation !== undefined) {
            analyticsData.metrics.solarRadiation = {
              value: reading.totalSolarRadiation,
              unit: "W/m²",
              quality: reading.level_quality || "good",
            }
          }

          if (reading.level !== undefined) {
            analyticsData.metrics.level = {
              value: reading.level,
              unit: "M",
              quality: reading.solar_quality || "good",
            }
          }

          if (reading.signalStrength !== undefined) {
            analyticsData.metrics.connectivity = {
              signalStrength: reading.signalStrength,
              quality: reading.signal_quality || "good",
            }
          }

          

          const qualityFactors = []
          Object.values(analyticsData.metrics).forEach((metric) => {
            if (metric.quality) {
              qualityFactors.push(metric.quality === "good" ? 100 : metric.quality === "fair" ? 70 : 30)
            }
          })

          analyticsData.dataQuality =
            qualityFactors.length > 0
              ? Math.round(qualityFactors.reduce((a, b) => a + b, 0) / qualityFactors.length)
              : 100

          try {
            await Analytics.create(analyticsData)
            processedCount++
          } catch (createError) {
            if (createError.code === 11000) {
              console.log(`⚠️ [Scheduler] Duplicate analytics entry skipped for device ${deviceId}`)
            } else {
              throw createError
            }
          }
        }

        logger.info("Processed device readings", { deviceId, readingCount: readings.length })
      } catch (deviceError) {
        logger.error("Error processing device data", {
          deviceId,
          error: deviceError.message,
        })
      }
    }

    console.log(`✅ [Scheduler] Processed ${processedCount} readings into analytics`.green)
    logger.info("Sensor data processing completed", { processedCount })
  } catch (error) {
    logger.error("Raw sensor data processing failed", { error: error.message })
    console.error("❌ [Scheduler] Sensor data processing error:", error.message)
  }
}

const cleanupOldData = async () => {
  try {
    console.log("🧹 [Scheduler] Starting data cleanup...".yellow)

    const retentionDays = Number.parseInt(process.env.DATA_RETENTION_DAYS) || 90
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    const sensorDataCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const deletedSensorData = await SensorData.deleteMany({
      timestamp: { $lt: sensorDataCutoff },
    }).maxTimeMS(30000)

    const deletedAnalytics = await Analytics.deleteMany({
      timestamp: { $lt: cutoffDate },
    }).maxTimeMS(30000)

    console.log(
      `🧹 [Scheduler] Cleanup completed - Removed ${deletedSensorData.deletedCount} sensor readings and ${deletedAnalytics.deletedCount} analytics entries`
        .green,
    )
    logger.info("Data cleanup completed", {
      deletedSensorData: deletedSensorData.deletedCount,
      deletedAnalytics: deletedAnalytics.deletedCount,
      retentionDays,
    })
  } catch (error) {
    logger.error("Data cleanup failed", { error: error.message })
    console.error("❌ [Scheduler] Data cleanup error:", error.message)
  }
}

const generateDailySummary = async () => {
  try {
    console.log("📈 [Scheduler] Generating daily summary...".blue)

    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const activeDevices = await Device.find({ status: "active" }).select("_id name type").lean().maxTimeMS(10000)

    for (const device of activeDevices) {
      const todayAnalytics = await Analytics.find({
        deviceId: device._id,
        timestamp: { $gte: startOfDay, $lt: endOfDay },
      })
        .lean()
        .maxTimeMS(10000)

      if (todayAnalytics.length === 0) continue

      const summary = {
        deviceId: device._id,
        deviceName: device.name,
        deviceType: device.type,
        date: startOfDay,
        dataPoints: todayAnalytics.length,
        averageDataQuality: Math.round(
          todayAnalytics.reduce((sum, record) => sum + (record.dataQuality || 100), 0) / todayAnalytics.length,
        ),
        metrics: {},
      }

      const metricSums = {}
      const metricCounts = {}

      todayAnalytics.forEach((record) => {
        Object.entries(record.metrics || {}).forEach(([metricName, metricData]) => {
          if (metricData.value !== undefined) {
            if (!metricSums[metricName]) {
              metricSums[metricName] = 0
              metricCounts[metricName] = 0
            }
            metricSums[metricName] += metricData.value
            metricCounts[metricName]++
          }
        })
      })

      Object.keys(metricSums).forEach((metricName) => {
        summary.metrics[metricName] = {
          average: Math.round((metricSums[metricName] / metricCounts[metricName]) * 100) / 100,
          dataPoints: metricCounts[metricName],
        }
      })

      logger.info("Daily summary generated", {
        deviceId: device._id,
        deviceName: device.name,
        dataPoints: summary.dataPoints,
        avgQuality: summary.averageDataQuality,
      })
    }

    console.log(`📈 [Scheduler] Daily summary completed for ${activeDevices.length} devices`.green)
  } catch (error) {
    logger.error("Daily summary generation failed", { error: error.message })
    console.error("❌ [Scheduler] Daily summary error:", error.message)
  }
}

const startIngestionJob = () => {
  if (!externalApiService) {
    console.warn("⚠️ [Scheduler] External API service not available, skipping ingestion job".yellow)
    return null
  }

  console.log("🚀 [Scheduler] Starting bulk sensor data ingestion job...")

  const ingestionJob = cron.schedule(
    "*/3 * * * *",
    async () => {
      console.log("🔄 [Scheduler] Running scheduled bulk sensor data ingestion job...")
      try {
        await fetchAndDistributeRawData()
        console.log("✅ [Scheduler] Bulk ingestion job completed successfully.")
      } catch (err) {
        logger.error("Error during bulk ingestion job", { error: err.message })
        console.error("❌ [Scheduler] Error during bulk ingestion job:", err.message)
      }
    },
    {
      scheduled: false,
      name: "bulk-data-ingestion",
      timezone: process.env.TZ || "UTC",
    },
  )

  return ingestionJob
}

const startDeviceStatusSyncJob = () => {
  // Check if device status sync should be skipped
  if (process.env.SKIP_DEVICE_STATUS_SYNC === 'true') {
    console.log("⚠️ [Scheduler] Device status sync job is disabled via environment variable")
    return null
  }

  console.log("🚀 [Scheduler] Starting device status synchronization job...")

  const deviceStatusJob = cron.schedule(
    "*/2 * * * *",
    async () => {
      console.log("🔄 [Scheduler] Running scheduled device status sync job...")
      try {
        await syncDeviceStatusFromExternalAPI()
        console.log("✅ [Scheduler] Device status sync job completed successfully.")
      } catch (err) {
        logger.error("Error during device status sync job", { error: err.message })
        console.error("❌ [Scheduler] Error during device status sync job:", err.message)
      }
    },
    {
      scheduled: false,
      name: "device-status-sync",
      timezone: process.env.TZ || "UTC",
    },
  )

  return deviceStatusJob
}

const startIngestionScheduler = () => {
  if (isSchedulerRunning) {
    console.log("⚠️ [Scheduler] Ingestion scheduler is already running".yellow)
    return
  }

  try {
    console.log("🚀 [Scheduler] Starting enhanced ingestion scheduler...".green.bold)

    const dataProcessingJob = cron.schedule(
      "*/5 * * * *",
      () => {
        processRawSensorData()
      },
      {
        scheduled: false,
        name: "data-processing",
        timezone: process.env.TZ || "UTC",
      },
    )

    const cleanupJob = cron.schedule(
      "0 2 * * *",
      () => {
        cleanupOldData()
      },
      {
        scheduled: false,
        name: "data-cleanup",
        timezone: process.env.TZ || "UTC",
      },
    )

    const summaryJob = cron.schedule(
      "59 23 * * *",
      () => {
        generateDailySummary()
      },
      {
        scheduled: false,
        name: "daily-summary",
        timezone: process.env.TZ || "UTC",
      },
    )

    const bulkIngestionJob = startIngestionJob()

    const deviceStatusJob = startDeviceStatusSyncJob()

    dataProcessingJob.start()
    cleanupJob.start()
    summaryJob.start()

    if (bulkIngestionJob) {
      bulkIngestionJob.start()
    }

    if (deviceStatusJob) {
      deviceStatusJob.start()
    }

    scheduledJobs.set("data-processing", dataProcessingJob)
    scheduledJobs.set("data-cleanup", cleanupJob)
    scheduledJobs.set("daily-summary", summaryJob)

    if (bulkIngestionJob) {
      scheduledJobs.set("bulk-data-ingestion", bulkIngestionJob)
    }

    if (deviceStatusJob) {
      scheduledJobs.set("device-status-sync", deviceStatusJob)
    }

    isSchedulerRunning = true

    console.log("✅ [Scheduler] Enhanced ingestion scheduler started successfully".green)
    console.log("📅 [Scheduler] Jobs scheduled:".blue)
    console.log("   • Data processing: Every 5 minutes".gray)
    console.log("   • Data cleanup: Daily at 2:00 AM".gray)
    console.log("   • Daily summary: Daily at 11:59 PM".gray)
    if (deviceStatusJob) {
      console.log("   • Device status sync: Every 2 minutes".gray)
    } else {
      console.log("   • Device status sync: DISABLED (HTTP-only mode)".yellow)
    }
    if (bulkIngestionJob) {
      console.log("   • Bulk data ingestion: Every 3 minutes".gray)
    }

    if (deviceStatusJob) {
      setTimeout(() => {
        console.log("🚀 [Scheduler] Running initial device status sync...".blue)
        syncDeviceStatusFromExternalAPI().catch((error) => {
          console.error("❌ [Scheduler] Initial device status sync failed:", error.message)
        })
      }, 3000)
    }

    setTimeout(() => {
      console.log("🚀 [Scheduler] Running initial bulk data fetch...".blue)
      fetchAndDistributeRawData().catch((error) => {
        console.error("❌ [Scheduler] Initial bulk data fetch failed:", error.message)
      })
    }, 5000)

    logger.info("Enhanced ingestion scheduler started", {
      jobs: Array.from(scheduledJobs.keys()),
      initialProcessingDelay: 5000,
      externalApiAvailable: !!externalApiService,
      deviceStatusSyncEnabled: !!deviceStatusJob,
    })
  } catch (error) {
    logger.error("Failed to start enhanced ingestion scheduler", { error: error.message })
    console.error("❌ [Scheduler] Failed to start enhanced ingestion scheduler:", error.message)
    throw error
  }
}

const stopIngestionScheduler = () => {
  try {
    console.log("🛑 [Scheduler] Stopping ingestion scheduler...".yellow)

    scheduledJobs.forEach((job, name) => {
      try {
        job.stop()
        job.destroy()
        console.log(`   • Stopped ${name}`.gray)
      } catch (jobError) {
        console.error(`   • Error stopping ${name}:`, jobError.message)
      }
    })

    scheduledJobs.clear()
    isSchedulerRunning = false

    console.log("✅ [Scheduler] Ingestion scheduler stopped".green)
    logger.info("Ingestion scheduler stopped")
  } catch (error) {
    logger.error("Error stopping ingestion scheduler", { error: error.message })
    console.error("❌ [Scheduler] Error stopping scheduler:", error.message)
  }
}

const getSchedulerStatus = () => {
  const activeJobs = Array.from(scheduledJobs.keys())
  return {
    isRunning: isSchedulerRunning,
    activeJobs: activeJobs,
    jobCount: scheduledJobs.size,
    externalApiAvailable: !!externalApiService,
    jobDetails: activeJobs.reduce((details, jobName) => {
      const job = scheduledJobs.get(jobName)
      details[jobName] = {
        running: job ? job.running : false,
        nextRun: job ? job.nextDate() : null,
      }
      return details
    }, {}),
  }
}

const restartIngestionScheduler = () => {
  console.log("🔄 [Scheduler] Restarting ingestion scheduler...".blue)

  if (isSchedulerRunning) {
    stopIngestionScheduler()
  }

  setTimeout(() => {
    startIngestionScheduler()
  }, 2000)
}

module.exports = {
  startIngestionJob,
  startIngestionScheduler,
  stopIngestionScheduler,
  restartIngestionScheduler,
  getSchedulerStatus,
  processRawSensorData,
  cleanupOldData,
  generateDailySummary,
  mapExternalDataToLocalSchema,
  fetchAndDistributeRawData,
  syncDeviceStatusFromExternalAPI,
  startDeviceStatusSyncJob,
}