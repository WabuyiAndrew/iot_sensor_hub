const mongoose = require("mongoose")
const ErrorResponse = require("../utils/errorResponse")
const rateLimit = require("express-rate-limit")
const asyncHandler = require("../middleware/asyncHandler"); // Ensure asyncHandler is imported

function getModels() {
  try {
    return {
      SensorData: mongoose.model("SensorData"),
      Device: mongoose.model("Device"),
      TankType: mongoose.model("TankType"),
    }
  } catch (error) {
    console.error("❌ [SensorIngestion] Error accessing models:", error.message)
    throw new Error("Database models not available")
  }
}

const sensorIngestionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: {
    success: false,
    error: "Too many sensor data submissions. Please slow down.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers["x-device-id"] || req.ip
  },
})

function parseSensorHexString(rawLine, logTimestamp = null) {
  try {
    if (!rawLine || typeof rawLine !== "string") {
      console.warn("[PARSER] Invalid input: rawLine must be a non-empty string")
      return null
    }
    let cleanHex = rawLine.toUpperCase().replace(/[\s:]/g, "")
    let timestamp = null
    const tsMatch = rawLine.match(
      /^(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\s+([A-Fa-f0-9]+)$/,
    )
    if (tsMatch) {
      try {
        timestamp = new Date(tsMatch[1])
        cleanHex = tsMatch[2].toUpperCase()
      } catch (e) {
        timestamp = null
      }
    } else if (logTimestamp) {
      try {
        timestamp = new Date(logTimestamp)
      } catch (e) {
        timestamp = null
      }
    }

    if (!/^[0-9A-F]+$/.test(cleanHex)) {
      console.warn("[PARSER] Invalid hex characters found after cleaning.")
      return null
    }
    if (cleanHex.length < 32) {
      console.warn(`[PARSER] Hex string too short: ${cleanHex.length} chars. Expected at least 32 for header.`)
      return null
    }

    const header = cleanHex.substring(0, 4)
    if (header !== "FEDC") {
      console.warn(`[PARSER] Invalid protocol header: '${header}'. Expected 'FEDC'.`)
      return null
    }

    const versionHex = cleanHex.substring(4, 6)
    const sensorIdHex = cleanHex.substring(6, 18)
    const sessionIdHex = cleanHex.substring(18, 26)
    const orderHex = cleanHex.substring(26, 28)
    const lengthHex = cleanHex.substring(28, 32)

    const version = Number.parseInt(versionHex, 16) / 10.0
    const sessionId = Number.parseInt(sessionIdHex, 16).toString()
    const order = Number.parseInt(orderHex, 16)
    const dataLength = Number.parseInt(lengthHex, 16)

    const sensorTypes = {
      "16098522754E": "ultrasonic_level_sensor",
      "124A7DA90849": "ultrasonic_level_sensor",
      160985227550: "pressure_transmitter",
      160985227551: "radar_level_sensor",
    }

    const sensorType = sensorTypes[sensorIdHex] || "ultrasonic_level_sensor"

    let currentIndex = 32
    const parsedValues = {}

    const parse4ByteHex = () => {
      if (currentIndex + 8 > cleanHex.length) {
        console.warn(`[PARSER] Not enough hex data for 4-byte value at index ${currentIndex}.`)
        return null
      }
      const hexVal = cleanHex.substring(currentIndex, currentIndex + 8)
      currentIndex += 8
      const value = Number.parseInt(hexVal, 16)
      return value > 2147483647 ? value - 4294967296 : value
    }

    console.log(`[PARSER] Parsing sensor type: ${sensorType}`)
    parsedValues.temperature = parse4ByteHex() / 10.0
    parsedValues.humidity = parse4ByteHex() / 10.0
    parsedValues.pm2_5 = parse4ByteHex()
    parsedValues.pm10 = parse4ByteHex()
    parsedValues.noise = parse4ByteHex() / 10.0

    const rawLiquidLevel = parse4ByteHex()
    if (rawLiquidLevel !== null) {
      if (sensorType.includes("ultrasonic") || sensorType.includes("radar")) {
        parsedValues.ultrasonic_liquid_level = rawLiquidLevel / 1000.0
        parsedValues.liquid_level_raw = rawLiquidLevel / 1000.0
      } else if (sensorType.includes("pressure")) {
        parsedValues.pressure_level = rawLiquidLevel / 1000.0
        parsedValues.liquid_level_raw = rawLiquidLevel / 1000.0
      } else {
        parsedValues.liquid_level_raw = rawLiquidLevel / 1000.0
      }
      console.log(`[PARSER] ✅ LIQUID LEVEL DETECTED: ${rawLiquidLevel} raw -> ${parsedValues.liquid_level_raw}m`)
    }

    const rawRssi = parse4ByteHex()
    parsedValues.signal_rssi_raw = rawRssi
    parsedValues.signal_rssi_dbm = rawRssi === 0 ? -100 : Math.max(-100, Math.min(0, -(100 - rawRssi)))
    parsedValues.error_code = parse4ByteHex()

    if (currentIndex + 8 <= cleanHex.length) {
      const additionalReading = parse4ByteHex()
      if (additionalReading !== null && !parsedValues.liquid_level_raw) {
        parsedValues.liquid_level_raw = additionalReading / 1000.0
        console.log(`[PARSER] ✅ ADDITIONAL LIQUID LEVEL: ${additionalReading} -> ${parsedValues.liquid_level_raw}m`)
      }
    }

    const result = {
      serialNumber: sensorIdHex,
      sensorId: sensorIdHex,
      sessionId,
      order,
      sensorType,
      timestamp: timestamp || new Date(),
      version,
      rawHexString: cleanHex,
      parsedData: parsedValues,
      source: "tcp-daemon",
      ...parsedValues,
    }

    console.log(`[PARSER] ✅ PARSED RESULT:`, {
      serialNumber: result.serialNumber,
      sensorType: result.sensorType,
      liquid_level_raw: result.liquid_level_raw,
      ultrasonic_liquid_level: result.ultrasonic_liquid_level,
      pressure_level: result.pressure_level,
    })

    return result
  } catch (error) {
    console.error(`[PARSER] Error during hex string parsing: ${error.message}`)
    return null
  }
}

// ✅ COMPLETELY REWRITTEN: Safe device creation/update function
async function findOrCreateDevice(serialNumber, inferredDeviceType) {
  const { Device } = getModels()
  try {
    let device = await Device.findOne({ serialNumber: serialNumber.toUpperCase() }).populate("tankType").exec()

    if (!device) {
      console.log(`🆕 AUTO-REGISTERING DEVICE: ${serialNumber}`)
      // Create device with clean parameters
      const cleanDeviceData = {
        name: `Auto-registered ${serialNumber}`,
        serialNumber: serialNumber.toUpperCase(),
        type: inferredDeviceType,
        status: "online",
        isActive: true,
        parameters: {
          samplingInterval: 60,
          measurementUnit: "meters",
          thresholds: {
            lowBattery: 20,
            offlineTimeoutMinutes: 60,
          },
          calibrationOffset: 0,
          sensorMountingHeight: 0,
          tankTotalHeight: 0,
        },
        installation: {
          installationDate: new Date(),
          calibrationOffset: 0,
          mountingHeight: 0,
        },
        specifications: {
          minRange: 0,
          maxRange: 10,
          accuracy: 0.01,
          deadBand: 0.1,
          outputType: "digital",
        },
      }

      device = await Device.create(cleanDeviceData)
      device = await Device.findById(device._id).populate("tankType").exec()
      console.log(`✅ Device auto-registered successfully: ${device.serialNumber}`)
    } else if (device.type !== inferredDeviceType) {
      console.log(`🔄 UPDATING DEVICE TYPE: ${device.type} -> ${inferredDeviceType}`)
      // ✅ CRITICAL FIX: Use direct update without parameter manipulation
      try {
        // First, let's check the current parameters
        console.log(`🔍 Current device parameters:`, JSON.stringify(device.parameters, null, 2))
        // Only update the type, don't touch parameters if they're corrupted
        await Device.updateOne(
          { _id: device._id },
          {
            $set: {
              type: inferredDeviceType,
              // Only set parameters if they're currently invalid
              ...((!device.parameters ||
                typeof device.parameters !== "object" ||
                Array.isArray(device.parameters.measurementUnit) ||
                typeof device.parameters.measurementUnit !== "string") && {
                parameters: {
                  samplingInterval: 60,
                  measurementUnit: "meters",
                  thresholds: {
                    lowBattery: 20,
                    offlineTimeoutMinutes: 60,
                  },
                  calibrationOffset: 0,
                  sensorMountingHeight: 0,
                  tankTotalHeight: 0,
                },
              }),
            },
          },
        )

        // Refresh the device object
        device = await Device.findById(device._id).populate("tankType").exec()
        console.log(`✅ Device type updated successfully: ${device.serialNumber}`)
      } catch (updateError) {
        console.error(`❌ Error updating device type for ${serialNumber}:`, updateError.message)
        // If update fails, try to fix the parameters completely
        console.log(`🔧 Attempting to fix corrupted parameters for ${serialNumber}`)
        await Device.updateOne(
          { _id: device._id },
          {
            $set: {
              type: inferredDeviceType,
              parameters: {
                samplingInterval: 60,
                measurementUnit: "meters",
                thresholds: {
                  lowBattery: 20,
                  offlineTimeoutMinutes: 60,
                },
                calibrationOffset: 0,
                sensorMountingHeight: 0,
                tankTotalHeight: 0,
              },
            },
          },
        )
        device = await Device.findById(device._id).populate("tankType").exec()
        console.log(`✅ Device parameters fixed and type updated: ${device.serialNumber}`)
      }
    }

    return device
  } catch (error) {
    console.error(`❌ Error in findOrCreateDevice for ${serialNumber}:`, error.message)
    console.error(`❌ Stack trace:`, error.stack)
    throw error
  }
}

const createRawSensorData = asyncHandler(async (req, res, next) => {
  const startTime = Date.now()
  const { rawHexString, timestamp: logTimestamp, source } = req.body
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  console.log(`\n🔄 [${requestId}] ===== PROCESSING NEW SENSOR DATA =====`)
  console.log(`[${requestId}] Raw hex string: ${rawHexString?.substring(0, 100)}...`)

  try {
    const { SensorData } = getModels()

    if (!rawHexString || typeof rawHexString !== "string") {
      return next(new ErrorResponse("rawHexString is required and must be a string", 400))
    }

    if (rawHexString.length > 2048) {
      return next(new ErrorResponse("Raw hex string too long (max 2048 characters)", 400))
    }

    if (!/^[0-9A-Fa-f\s:]*$/.test(rawHexString)) {
      return next(new ErrorResponse("Invalid hex string format. Contains non-hex characters.", 400))
    }

    const parsedSensorData = parseSensorHexString(rawHexString, logTimestamp)
    if (!parsedSensorData) {
      console.warn(`[${requestId}] ❌ Failed to parse hex: ${rawHexString.substring(0, 50)}...`)
      return next(new ErrorResponse("Could not parse sensor data. Invalid format or incomplete payload.", 400))
    }

    console.log(`[${requestId}] ✅ PARSED DATA:`, {
      serialNumber: parsedSensorData.serialNumber,
      sensorType: parsedSensorData.sensorType,
      liquid_level_raw: parsedSensorData.liquid_level_raw,
      ultrasonic_liquid_level: parsedSensorData.ultrasonic_liquid_level,
      pressure_level: parsedSensorData.pressure_level,
      temperature: parsedSensorData.temperature,
    })

    let inferredDeviceType = "ultrasonic_level_sensor"
    if (parsedSensorData.ultrasonic_liquid_level !== undefined && parsedSensorData.ultrasonic_liquid_level !== null) {
      inferredDeviceType = "ultrasonic_level_sensor"
    } else if (parsedSensorData.pressure_level !== undefined && parsedSensorData.pressure_level !== null) {
      inferredDeviceType = "pressure_transmitter"
    } else if (parsedSensorData.liquid_level_raw !== undefined && parsedSensorData.liquid_level_raw !== null) {
      inferredDeviceType = "ultrasonic_level_sensor"
    }

    console.log(`[${requestId}] 🔍 INFERRED DEVICE TYPE: ${inferredDeviceType}`)

    // Use the safer device creation function
    const device = await findOrCreateDevice(parsedSensorData.serialNumber, inferredDeviceType)

    if (!device.isActive) {
      return next(new ErrorResponse(`Device '${device.name}' is not active. Data rejected.`, 403))
    }

    // --- NEW LOGIC: Check for duplicate sensor data before saving ---
    const existingReading = await SensorData.findOne({
      deviceId: device._id,
      timestamp: parsedSensorData.timestamp,
    })

    if (existingReading) {
      console.log(`[${requestId}] ⚠️ DUPLICATE: Sensor data already exists for device ${device.serialNumber} at ${parsedSensorData.timestamp}. Skipping save.`)
      const processingTime = Date.now() - startTime
      console.log(`[${requestId}] 🏁 Processing complete in ${processingTime}ms.`)
      return res.status(200).json({
        success: true,
        message: "Duplicate sensor data received and ignored.",
        data: {
          sensorDataId: existingReading._id,
          deviceId: device.serialNumber,
          timestamp: existingReading.timestamp,
          status: "duplicate",
        },
      })
    }
    // --- END NEW LOGIC ---

    console.log(`[${requestId}] 📱 DEVICE INFO:`, {
      name: device.name,
      type: device.type,
      hasTank: !!device.tankType,
      tankName: device.tankType?.name,
      parametersValid: !!(
        device.parameters?.samplingInterval &&
        device.parameters?.measurementUnit &&
        typeof device.parameters.measurementUnit === "string"
      ),
    })

    const sensorDataRecord = {
      deviceId: device._id,
      sensorId: parsedSensorData.sensorId,
      sessionId: parsedSensorData.sessionId,
      order: parsedSensorData.order,
      sensorType: parsedSensorData.sensorType,
      timestamp: parsedSensorData.timestamp,
      version: parsedSensorData.version,
      rawHexString: parsedSensorData.rawHexString,
      parsedData: parsedSensorData.parsedData,
      temperature: parsedSensorData.temperature,
      humidity: parsedSensorData.humidity,
      pm2_5: parsedSensorData.pm2_5,
      pm10: parsedSensorData.pm10,
      noise: parsedSensorData.noise,
      ultrasonic_liquid_level: parsedSensorData.ultrasonic_liquid_level,
      pressure_level: parsedSensorData.pressure_level,
      liquid_level_raw: parsedSensorData.liquid_level_raw,
      atmospheric_pressure: parsedSensorData.atmospheric_pressure,
      wind_speed: parsedSensorData.wind_speed,
      wind_direction: parsedSensorData.wind_direction,
      rainfall: parsedSensorData.rainfall,
      total_solar_radiation: parsedSensorData.total_solar_radiation,
      signal_rssi_raw: parsedSensorData.signal_rssi_raw,
      signal_rssi_dbm: parsedSensorData.signal_rssi_dbm,
      error_code: parsedSensorData.error_code,
      co2: parsedSensorData.co2,
    }

    const newSensorReading = new SensorData(sensorDataRecord)
    await newSensorReading.save()

    // FIXED: Update device with safer method
    try {
      await device.updateLastSeen()
    } catch (updateError) {
      console.warn(`[${requestId}] ⚠️ Could not update device lastSeen: ${updateError.message}`)
      // Don't fail the entire request if lastSeen update fails
    }

    const processingTime = Date.now() - startTime
    console.log(`[${requestId}] ✅ SENSOR DATA SAVED in ${processingTime}ms`)

    // CRITICAL FIX: ADD VOLUME PROCESSING HERE!
    let volumeProcessingResult = null

    // Check if device has a tank and we have liquid level data
    if (
      device.tankType &&
      parsedSensorData.liquid_level_raw !== null &&
      parsedSensorData.liquid_level_raw !== undefined
    ) {
      console.log(`[${requestId}] 🚀 TRIGGERING VOLUME PROCESSING...`)
      console.log(`[${requestId}] Tank: ${device.tankType.name}`)
      console.log(`[${requestId}] Liquid Level: ${parsedSensorData.liquid_level_raw}m`)

      // Trigger volume processing in background
      setImmediate(async () => {
        try {
          const { processTankVolumeReading } = require("../services/volumeProcessor")

          const volumeResult = await processTankVolumeReading(
            device.serialNumber,
            parsedSensorData.liquid_level_raw,
            {
              sensorType: parsedSensorData.sensorType || device.type,
              timestamp: parsedSensorData.timestamp,
              temperature: parsedSensorData.temperature,
              humidity: parsedSensorData.humidity,
              battery_level: parsedSensorData.battery_level,
              signal_rssi_dbm: parsedSensorData.signal_rssi_dbm,
              forceRecalculation: false,
            },
          )

          if (volumeResult.success) {
            console.log(`[${requestId}] ✅ VOLUME PROCESSING SUCCESS:`, {
              tankName: volumeResult.tankName,
              volumeLiters: volumeResult.volumeLiters,
              fillPercentage: volumeResult.fillPercentage,
            })

            // Update sensor data record to mark as processed
            await SensorData.findByIdAndUpdate(newSensorReading._id, {
              processed: true,
              dataQuality: volumeResult.dataQuality,
            })
          } else {
            console.error(`[${requestId}] ❌ VOLUME PROCESSING FAILED:`, volumeResult.message)
          }
        } catch (volumeError) {
          console.error(`[${requestId}] ❌ VOLUME PROCESSING ERROR:`, volumeError.message)
        }
      })

      volumeProcessingResult = {
        triggered: true,
        tankName: device.tankType.name,
        liquidLevel: parsedSensorData.liquid_level_raw,
      }
    } else {
      console.log(
        `[${requestId}] ⚠️ NO VOLUME PROCESSING - Tank: ${!!device.tankType}, Level: ${parsedSensorData.liquid_level_raw}`,
      )
    }

    console.log(`\n✅ [${requestId}] ===== PROCESSING COMPLETE =====\n`)

    res.status(201).json({
      success: true,
      message: "Sensor data ingested successfully. Volume calculation triggered.",
      data: {
        sensorDataId: newSensorReading._id,
        deviceId: device.serialNumber,
        timestamp: newSensorReading.timestamp,
        processed: newSensorReading.processed,
        volumeProcessing: volumeProcessingResult,
      },
    })

    // Broadcast sensor data if global function exists
    setImmediate(async () => {
      try {
        if (global.broadcastSensorData) {
          global.broadcastSensorData({
            ...newSensorReading.toObject(),
            device: {
              _id: device._id,
              name: device.name,
              serialNumber: device.serialNumber,
              type: device.type,
              assignedToUser: device.assignedToUser,
            },
          })
        }
      } catch (error) {
        console.error(`[${requestId}] Post-processing (broadcast) error: ${error.message}`)
      }
    })
  } catch (err) {
    const processingTime = Date.now() - startTime
    console.error(`[${requestId}] ❌ ERROR after ${processingTime}ms: ${err.message}`)
    console.error(`[${requestId}] Stack:`, err.stack)

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message)
      return next(new ErrorResponse(`Database validation error: ${messages.join(", ")}`, 400))
    }

    if (err.name === "CastError") {
      return next(new ErrorResponse(`Database casting error: ${err.message}`, 400))
    }

    if (err.code === 11000) {
      return next(new ErrorResponse("Duplicate sensor data entry detected.", 409))
    }

    next(new ErrorResponse("Server error during sensor data ingestion", 500))
  }
});

const triggerVolumeProcessing = asyncHandler(async (req, res, next) => {
  const { processTankVolumeReading } = require("../services/volumeProcessor")
  try {
    const { deviceSerialNumber, sensorValue, sensorType } = req.body
    const requestId = `manual-${Date.now()}`

    console.log(`\n🔧 [${requestId}] ===== MANUAL VOLUME PROCESSING =====`)
    console.log(`[${requestId}] Device: ${deviceSerialNumber}`)
    console.log(`[${requestId}] Sensor Value: ${sensorValue}`)
    console.log(`[${requestId}] Sensor Type: ${sensorType}`)

    if (!deviceSerialNumber || sensorValue === undefined || sensorValue === null) {
      return next(new ErrorResponse("deviceSerialNumber and sensorValue are required", 400))
    }

    const volumeResult = await processTankVolumeReading(deviceSerialNumber, sensorValue, {
      sensorType: sensorType || "ultrasonic_level_sensor",
      timestamp: new Date(),
    })

    console.log(`[${requestId}] ✅ MANUAL PROCESSING RESULT:`, volumeResult)

    res.status(200).json({
      success: true,
      message: "Manual volume processing completed",
      data: volumeResult,
    })
  } catch (error) {
    console.error(`❌ Manual volume processing error:`, error)
    next(new ErrorResponse("Manual volume processing failed", 500))
  }
});

const getRawSensorDataStats = asyncHandler(async (req, res, next) => {
  try {
    const { SensorData } = getModels()
    const { hours = 24, deviceId } = req.query
    const hoursInt = Math.min(Math.max(Number.parseInt(hours), 1), 168)

    console.log(`📊 Fetching stats for last ${hoursInt} hours`)

    const startTime = new Date(Date.now() - hoursInt * 60 * 60 * 1000)

    const matchQuery = {
      timestamp: { $gte: startTime },
      rawHexString: { $exists: true, $ne: "" },
    }

    if (deviceId) {
      matchQuery.deviceId = new mongoose.Types.ObjectId(deviceId)
    }

    const stats = await SensorData.getSensorDataStats({ deviceId, hours: hoursInt })

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalReadings: 0,
        uniqueDeviceCount: 0,
        uniqueSensorTypeCount: 0,
        errorCount: 0,
        errorRate: 0,
      },
      query: { hours: hoursInt, deviceId },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`Stats error: ${error.message}`)
    next(new ErrorResponse("Failed to fetch sensor data statistics", 500))
  }
});

const getIngestionHealth = asyncHandler(async (req, res) => {
  try {
    const { SensorData } = getModels()
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000)

    const recentData = await SensorData.countDocuments({
      timestamp: { $gte: last5Minutes },
    })

    const activeDevices = await SensorData.distinct("deviceId", {
      timestamp: { $gte: last5Minutes },
    })

    const health = {
      status: recentData > 0 ? "healthy" : "warning",
      recentReadings: recentData,
      activeDevices: activeDevices.length,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json({
      success: true,
      data: health,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
});


module.exports = {
  createRawSensorData,
  triggerVolumeProcessing,
  getRawSensorDataStats,
  getIngestionHealth,
  sensorIngestionLimiter, // Export the limiter function directly
};
