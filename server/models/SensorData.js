const mongoose = require("mongoose")

// Check if the SensorData model already exists to prevent Mongoose's OverwriteModelError
if (mongoose.models.SensorData) {
  module.exports = mongoose.models.SensorData
} else {
  const sensorDataSchema = new mongoose.Schema(
    {
      deviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
        required: [true, "Device ID is required"],
        index: true,
      },

      sensorId: {
        type: String,
        index: true,
        uppercase: true,
        match: [/^[0-9A-F]{12}$/, "Sensor ID must be 12 hexadecimal characters"],
      },

      sessionId: {
        type: String,
      },

      order: {
        type: Number,
      },

      sensorType: {
        type: String,
        required: false,
        enum: {
          values: [
            "air_quality",
            "temperature_humidity",
            "WeatherS",
            "Level1",
            "multi_sensor",
            "air_quality_noise",
            "generic",
            "raw",
            "unknown",
            "Level2",
            "radar_level_sensor",
            "pressure_transmitter",
            "submersible_level_sensor",
            "guided_wave_radar",
            "laser_level_sensor",
            "float_switch",
            "capacitive_level_sensor",
            "vibrating_fork",
            "load_cell",
          ],
        },
      },
      timestamp: {
        type: Date,
        required: [true, "Timestamp is required"],
      },
      // Raw data payload from the external API
      data: {
        header: String,
        version: String,
        deviceNumber: String,
        session: String,
        order: String,
        length: String,
        body: Object,
        end: String,
      },
      // Individual sensor values extracted for easier querying and indexing
      temperature: Number,
      humidity: Number,
      ultrasonic_liquid_level: Number,
      pressure_level: Number,
      liquid_level_raw: Number,
      battery_level: Number,
      signal_rssi_dbm: Number,
      signal_rssi_raw: Number,
      level: Number, 
      // Status information
      status: {
        type: String,
        enum: ["online", "offline", "unknown"],
        default: "unknown",
      },
      // Add other specific sensor fields as needed for different device types
      pm2_5: Number,
      pm10: Number,
      co2: Number,
      atmospheric_pressure: Number,
      wind_speed: Number,
      wind_direction: String,
      rainfall: Number,
      total_solar_radiation: Number,
      noise: Number,
      error_code: Number,

      // Additional fields for processing and metadata
      processedForAnalytics: {
        type: Boolean,
        default: false,
      },
      processed: {
        type: Boolean,
        default: false,
      },
      processingInfo: {
        calculationMethod: String,
        processedAt: Date,
        sensorType: String,
        validationPassed: Boolean,
        error: String,
      },
    },
    {
      timestamps: true, // Adds createdAt and updatedAt timestamps
      strict: false, // Allows other fields to be added dynamically
    },
  )

  // --- SUGGESTION IMPLEMENTED: COMPOUND INDEX FOR QUERIES ---
  // A compound index on deviceId and timestamp will significantly improve the performance
  // of queries that filter by both fields, such as in getSensorDataByDeviceIdAndParameter.
  sensorDataSchema.index({ deviceId: 1, timestamp: -1 })
  // --- END OF SUGGESTION ---

  // Post-Save Middleware to trigger volume processing
  sensorDataSchema.post("save", async (doc, next) => {
    const requestId = `post-save-trigger-${Date.now()}`
    console.log(`\n[${requestId}] 🚀 Starting post-save processing for new sensor data`)

    try {
      const Device = mongoose.model("Device")

      let Tank
      try {
        Tank = mongoose.model("Tank")
      } catch (error) {
        console.log(`[${requestId}] ⚠️ Tank model not registered. Skipping volume calculation.`)
        return next()
      }

      console.log(`[${requestId}] 🔍 Finding associated device and tank...`)
      const device = await Device.findById(doc.deviceId)
      if (!device) {
        console.error(`[${requestId}] ❌ Device not found for sensor data record: ${doc._id}`)
        return next()
      }

      const tank = await Tank.findOne({ device: device._id })
      if (!tank) {
        console.log(`[${requestId}] ⚠️ No tank found for device ${device.serialNumber}. Skipping volume calculation.`)
        return next()
      }
      console.log(`[${requestId}] ✅ Found device and tank`)

      // This is a placeholder for the actual volume calculation logic.
      // You would call a service here to process the raw sensor data and
      // calculate the tank volume.
      console.log(`[${requestId}] ⚙️ Calling volume processing service...`)

      let volumeService
      try {
        volumeService = require("../services/volumeCalculationService")
      } catch (error) {
        console.log(`[${requestId}] ⚠️ Volume calculation service not found. Skipping volume calculation.`)
        return next()
      }

      const volumeResult = volumeService.calculateVolumeFromReading(doc, tank)
      console.log(`[${requestId}] ✅ Volume processing service returned:`, volumeResult)

      // Update the tank document with the latest volume and level
      if (volumeResult.success) {
        const lastReadingTimestamp = doc.timestamp || doc.createdAt
        await Tank.findByIdAndUpdate(tank._id, {
          $set: {
            currentVolume: volumeResult.volume,
            currentLevel: volumeResult.level,
            lastReadingAt: lastReadingTimestamp,
          },
          $inc: { readingCount: 1 },
        })
        console.log(`[${requestId}] ✅ Tank ${tank._id} updated with new volume and level`)
      }

      // Mark sensor data as processed regardless of volume calculation success
      await mongoose.model("SensorData").findByIdAndUpdate(doc._id, {
        $set: {
          processed: true,
          "processingInfo.calculationMethod": volumeResult.calculationMethod || tank.shape,
          "processingInfo.sensorType": device.type,
          "processingInfo.processedAt": new Date(),
          "processingInfo.validationPassed": volumeResult.success,
          "processingInfo.error": volumeResult.message,
        },
      })
      console.log(`[${requestId}] ✅ SensorData marked as processed`)
    } catch (error) {
      console.error(`[${requestId}] ❌ Error in post-save volume processing:`, error)
      console.error(`[${requestId}] ❌ Stack trace:`, error.stack)
    }

    console.log(`[${requestId}] 🏁 Post-save processing completed\n`)
  })

  // Post-Save Error Middleware
  sensorDataSchema.post("save", (error, doc, next) => {
    if (error.name === "ValidationError") {
      console.error(`❌ Sensor data validation failed for device ${doc?.deviceId}:`, error.message)
    } else if (error.code === 11000) {
      console.error(`❌ Duplicate sensor data entry for device ${doc?.deviceId}`)
    }
    next(error)
  })

  // Configure schema options
  sensorDataSchema.set("toJSON", { virtuals: true })
  sensorDataSchema.set("toObject", { virtuals: true })

  // Create the model from the schema
  const SensorData = mongoose.model("SensorData", sensorDataSchema)
  module.exports = SensorData
}
