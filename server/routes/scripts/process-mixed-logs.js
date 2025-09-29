const fs = require("fs")
const readline = require("readline")
const mongoose = require("mongoose")
const Joi = require("joi")
const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })

const SensorData = require("../models/sensorData")
const Device = require("../models/device")
const parseSensorHexString = require("../utils/sensorParser")

const logFilePath = "sensor_logs.log"
const processedDataBuffer = []
const BATCH_SIZE = 500

// Your existing validation schema (from sensor ingestion controller)
const parsedSensorDataSchema = Joi.object({
  deviceId: Joi.string().hex().length(24).optional(),
  sensorId: Joi.string().hex().length(12).required().messages({
    "string.hex": "Parsed sensorId must be a valid 12-char hexadecimal string.",
    "string.length": "Parsed sensorId must be 12 characters long.",
    "any.required": "Parsed sensorId is required.",
  }),
  sensorType: Joi.string().required(),
  timestamp: Joi.date().iso().optional(),
  sessionId: Joi.number().optional().allow(null),
  temperature: Joi.number().optional().allow(null),
  humidity: Joi.number().optional().allow(null),
  pm2_5: Joi.number().optional().allow(null),
  pm10: Joi.number().optional().allow(null),
  signal_rssi_raw: Joi.number().optional().allow(null),
  signal_rssi_dbm: Joi.number().optional().allow(null),
  error_code: Joi.number().integer().optional().allow(null),
  version: Joi.number().optional().allow(null),
  noise: Joi.number().optional().allow(null),
  ultrasonic_liquid_level: Joi.number().optional().allow(null),
  atmospheric_pressure: Joi.number().optional().allow(null),
  wind_speed: Joi.number().optional().allow(null),
  wind_direction: Joi.number().optional().allow(null),
  rainfall: Joi.number().optional().allow(null),
  total_solar_radiation: Joi.number().optional().allow(null),
  raw_payload_hex: Joi.string().optional().allow(null, ""),
  raw_sensor_id_hex: Joi.string().hex().length(12).required(),
  raw_session_id_hex: Joi.string().optional().allow(null, ""),
}).unknown(true)

// Enhanced validation for sensor hex strings
function isValidSensorHex(hexString) {
  const cleanHex = hexString.replace(/\s/g, "").toUpperCase()

  // Must be valid hex
  if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
    return false
  }

  // Must start with FEDC (your sensor protocol header)
  if (!cleanHex.startsWith("FEDC")) {
    return false
  }

  // Must be at least 32 characters (minimum for your protocol)
  if (cleanHex.length < 32) {
    return false
  }

  // Check for known sensor IDs from your translation document
  const sensorIdHex = cleanHex.substring(6, 18)
  const knownSensorIds = ["16098522754E", "124A7DA90849"] // Air Quality and Weather Station

  if (!knownSensorIds.includes(sensorIdHex)) {
    console.warn(`[Validator] Unknown sensor ID: ${sensorIdHex} - allowing generic parsing`)
  }

  return true
}

async function insertBatch() {
  if (processedDataBuffer.length === 0) return 0

  try {
    console.log(`💾 Inserting batch of ${processedDataBuffer.length} documents...`)

    const result = await SensorData.insertMany(processedDataBuffer, {
      ordered: false,
    })

    const insertedCount = result.length
    console.log(`✅ Successfully inserted: ${insertedCount} documents`)

    processedDataBuffer.length = 0
    return insertedCount
  } catch (error) {
    console.error("❌ Batch insertion error:", error.message)

    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      console.log("⚠️  Some documents already exist (duplicate key), continuing...")
    }

    // Try individual insertion for failed batch
    let successCount = 0
    for (const doc of processedDataBuffer) {
      try {
        await SensorData.create(doc)
        successCount++
      } catch (individualError) {
        if (individualError.code !== 11000) {
          // Ignore duplicates
          console.error("Individual insert failed:", individualError.message)
        }
      }
    }

    processedDataBuffer.length = 0
    return successCount
  }
}

async function processLogFileWithMixedData() {
  console.log(`🚀 Processing mixed log file: ${logFilePath}`)
  console.log("🔍 Filtering for valid sensor data (FEDC headers only)")

  const mongoURI = process.env.MONGODB_URI
  if (!mongoURI) {
    console.error("❌ MONGODB_URI not set")
    process.exit(1)
  }

  try {
    await mongoose.connect(mongoURI)
    console.log("✅ MongoDB connected")

    // Check existing data and devices
    const existingCount = await SensorData.countDocuments()
    const deviceCount = await Device.countDocuments()
    console.log(`📊 Existing sensor data: ${existingCount} documents`)
    console.log(`📱 Available devices: ${deviceCount}`)

    // Show available devices for debugging
    const devices = await Device.find({}, { name: 1, serialNumber: 1 }).limit(10)
    console.log("🔧 Available devices:")
    devices.forEach((device) => {
      console.log(`  - ${device.name}: ${device.serialNumber}`)
    })
  } catch (err) {
    console.error("❌ MongoDB connection error:", err)
    process.exit(1)
  }

  if (!fs.existsSync(logFilePath)) {
    console.error(`❌ Log file not found: ${logFilePath}`)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(logFilePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Number.POSITIVE_INFINITY,
  })

  let lineNumber = 0
  let validSensorLines = 0
  let invalidHexLines = 0
  let successfullyParsed = 0
  let validationErrors = 0
  let deviceNotFound = 0
  let parsingErrors = 0
  let totalInserted = 0

  console.log("📝 Processing lines...\n")

  for await (const line of rl) {
    lineNumber++

    // Progress indicator
    if (lineNumber % 10000 === 0) {
      console.log(`📈 Processed ${lineNumber} lines... (${validSensorLines} valid sensor data found)`)
    }

    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/)
    const logTimestamp = timestampMatch ? timestampMatch[1] : null

    const hexDataStartIndex = line.indexOf("Bytes in Hex: ")
    if (hexDataStartIndex === -1) continue

    const rawHexString = line.substring(hexDataStartIndex + "Bytes in Hex: ".length).trim()

    // Filter out invalid hex strings (TLS, HTTP, etc.)
    if (!isValidSensorHex(rawHexString)) {
      invalidHexLines++
      continue
    }

    validSensorLines++

    try {
      // Use your existing parser
      const parsedData = parseSensorHexString(rawHexString, logTimestamp)

      if (!parsedData) {
        console.warn(`Line ${lineNumber}: Parser returned null for valid hex`)
        parsingErrors++
        continue
      }

      // Use your existing validation
      const { error, value } = parsedSensorDataSchema.validate(parsedData, {
        abortEarly: false,
        stripUnknown: true,
      })

      if (error) {
        console.warn(`Line ${lineNumber}: Validation error: ${error.details.map((d) => d.message).join(", ")}`)
        validationErrors++
        continue
      }

      // Find device using your existing logic
      const device = await Device.findOne({ serialNumber: value.raw_sensor_id_hex })
      if (!device) {
        if (deviceNotFound < 5) {
          // Limit spam
          console.warn(`Line ${lineNumber}: Device not found: ${value.raw_sensor_id_hex}`)
        }
        deviceNotFound++
        continue
      }

      // Attach device ID
      value.deviceId = device._id

      processedDataBuffer.push(value)
      successfullyParsed++

      // Insert batch when full
      if (processedDataBuffer.length >= BATCH_SIZE) {
        const inserted = await insertBatch()
        totalInserted += inserted
      }
    } catch (error) {
      console.error(`Line ${lineNumber}: Processing error: ${error.message}`)
      parsingErrors++
    }
  }

  // Insert remaining documents
  if (processedDataBuffer.length > 0) {
    const inserted = await insertBatch()
    totalInserted += inserted
  }

  // Final statistics
  console.log("\n📊 PROCESSING COMPLETE!")
  console.log("=".repeat(50))
  console.log(`📝 Total lines processed: ${lineNumber}`)
  console.log(`✅ Valid sensor data lines: ${validSensorLines}`)
  console.log(`❌ Invalid/filtered lines: ${invalidHexLines}`)
  console.log(`🔧 Successfully parsed: ${successfullyParsed}`)
  console.log(`💾 Actually inserted: ${totalInserted}`)
  console.log(`📋 Validation errors: ${validationErrors}`)
  console.log(`📱 Device not found: ${deviceNotFound}`)
  console.log(`⚠️  Parsing errors: ${parsingErrors}`)

  // Verify final count in database
  const finalCount = await SensorData.countDocuments()
  console.log(`\n🗄️  Final database count: ${finalCount} sensor data documents`)

  // Show success rate
  const successRate = validSensorLines > 0 ? ((totalInserted / validSensorLines) * 100).toFixed(1) : 0
  console.log(`📈 Success rate: ${successRate}% of valid sensor data was inserted`)

  await mongoose.disconnect()
  console.log("✅ Processing complete!")
}

// Run the script
processLogFileWithMixedData().catch((err) => {
  console.error("💥 Critical error:", err)
  mongoose.disconnect()
  process.exit(1)
})
