/**
 * FIXED Fast uploader for bulky sensor logs to MongoDB Atlas.
 * - Batches inserts (default: 1000 for better memory management).
 * - Caches Device lookups for repeated sensorId values.
 * - Enhanced logging for debugging.
 * - Better error handling.
 *
 * Usage:
 *   node scripts/fast_upload_sensor_logs.js /path/to/sensor_logs.log
 *
 * env:
 *   MONGODB_URI
 */
const fs = require("fs")
const readline = require("readline")
const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })

const SensorData = require("../models/sensorData")
const Device = require("../models/device")
const parseSensorHexString = require("../utils/sensorParser")

const LOG_FILE = process.argv[2] || "sensor_logs.log"
const BATCH_SIZE = 1000 // Reduced for better memory management

async function fastUpload() {
  console.log(`[UPLOADER] Starting upload from: ${LOG_FILE}`)
  console.log(`[UPLOADER] Batch size: ${BATCH_SIZE}`)
  console.log(`[UPLOADER] MongoDB URI: ${process.env.MONGODB_URI ? "Set" : "Not set"}`)

  await mongoose.connect(process.env.MONGODB_URI)
  console.log(`[UPLOADER] Connected to MongoDB`)

  const deviceCache = new Map()
  const buffer = []

  let total = 0,
    parsed = 0,
    inserted = 0,
    notFound = 0,
    skipped = 0,
    errors = 0

  // Check if file exists
  if (!fs.existsSync(LOG_FILE)) {
    console.error(`[UPLOADER] File not found: ${LOG_FILE}`)
    process.exit(1)
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(LOG_FILE),
    crlfDelay: Number.POSITIVE_INFINITY,
  })

  console.log(`[UPLOADER] Starting to process lines...`)

  for await (const line of rl) {
    total++

    // Skip empty lines
    if (!line.trim()) {
      skipped++
      continue
    }

    try {
      const parsedData = parseSensorHexString(line)
      if (!parsedData) {
        skipped++
        if (total % 1000 === 0) {
          console.log(`[UPLOADER] Skipped line ${total}: Could not parse`)
        }
        continue
      }

      // Look up device ID (with caching)
      let deviceId = deviceCache.get(parsedData.raw_sensor_id_hex)
      if (!deviceId) {
        const device = await Device.findOne({ serialNumber: parsedData.raw_sensor_id_hex }, "_id").lean()
        if (!device) {
          notFound++
          if (notFound <= 10) {
            // Only log first 10 not found
            console.log(`[UPLOADER] Device not found: ${parsedData.raw_sensor_id_hex}`)
          }
          continue
        }
        deviceId = device._id
        deviceCache.set(parsedData.raw_sensor_id_hex, deviceId)
        console.log(`[UPLOADER] Cached device: ${parsedData.raw_sensor_id_hex} -> ${deviceId}`)
      }

      parsedData.deviceId = deviceId
      buffer.push(parsedData)
      parsed++

      // Insert batch when buffer is full
      if (buffer.length >= BATCH_SIZE) {
        try {
          await SensorData.insertMany(buffer, { ordered: false })
          inserted += buffer.length
          console.log(`[UPLOADER] Inserted batch of ${buffer.length} records. Total inserted: ${inserted}`)
        } catch (insertError) {
          console.error(`[UPLOADER] Batch insert error:`, insertError.message)
          errors++
        }
        buffer.length = 0
      }

      // Progress update every 1000 lines
      if (total % 1000 === 0) {
        process.stdout.write(
          `\r[UPLOADER] Lines: ${total} | Parsed: ${parsed} | Inserted: ${inserted} | NotFound: ${notFound} | Skipped: ${skipped} | Errors: ${errors}`,
        )
      }
    } catch (error) {
      errors++
      console.error(`[UPLOADER] Error processing line ${total}:`, error.message)
    }
  }

  // Insert remaining buffer
  if (buffer.length > 0) {
    try {
      await SensorData.insertMany(buffer, { ordered: false })
      inserted += buffer.length
      console.log(`[UPLOADER] Inserted final batch of ${buffer.length} records`)
    } catch (insertError) {
      console.error(`[UPLOADER] Final batch insert error:`, insertError.message)
      errors++
    }
  }

  await mongoose.disconnect()
  console.log(`\n[UPLOADER] Upload completed!`)
  console.log(`[UPLOADER] Summary:`)
  console.log(`  - Total lines processed: ${total}`)
  console.log(`  - Successfully parsed: ${parsed}`)
  console.log(`  - Successfully inserted: ${inserted}`)
  console.log(`  - Devices not found: ${notFound}`)
  console.log(`  - Lines skipped: ${skipped}`)
  console.log(`  - Errors: ${errors}`)

  if (notFound > 0) {
    console.log(
      `\n[UPLOADER] WARNING: ${notFound} records were skipped because devices were not found in the database.`,
    )
    console.log(`[UPLOADER] Make sure all devices are registered before uploading sensor data.`)
  }
}

fastUpload().catch((err) => {
  console.error("[UPLOADER] Fatal error:", err)
  mongoose.disconnect()
  process.exit(1)
})
