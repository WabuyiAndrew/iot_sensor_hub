const mongoose = require("mongoose")

// ✅ ENHANCED: Tank Volume History Schema with better validation and error handling
const tankVolumeHistorySchema = new mongoose.Schema(
  {
    tankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TankType",
      required: [true, "Tank ID is required"],
      index: true,
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: [true, "Device ID is required"],
      index: true,
    },

    deviceSerialNumber: {
      type: String,
      required: [true, "Device serial number is required"],
      uppercase: true,
      index: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      required: [true, "Timestamp is required"],
      index: true,
    },

    // ✅ ENHANCED: Essential processed data with improved validation
    rawSensorReading: {
      type: Number,
      required: [true, "Raw sensor reading is required"],
      validate: {
        validator: (v) => v !== null && v !== undefined && !isNaN(v) && typeof v === "number",
        message: "Raw sensor reading must be a valid number",
      },
    },

    actualLevel: {
      type: Number,
      required: [true, "Actual level is required"],
      min: [0, "Actual level cannot be negative"],
      validate: {
        validator: (v) => v !== null && v !== undefined && !isNaN(v) && typeof v === "number" && v >= 0,
        message: "Actual level must be a valid non-negative number",
      },
    },

    volumeLiters: {
      type: Number,
      required: [true, "Volume in liters is required"],
      min: [0, "Volume in liters cannot be negative"],
      validate: {
        validator: (v) => v !== null && v !== undefined && !isNaN(v) && typeof v === "number" && v >= 0,
        message: "Volume in liters must be a valid non-negative number",
      },
    },

    volumeM3: {
      type: Number,
      required: [true, "Volume in cubic meters is required"],
      min: [0, "Volume in cubic meters cannot be negative"],
      validate: {
        validator: (v) => v !== null && v !== undefined && !isNaN(v) && typeof v === "number" && v >= 0,
        message: "Volume in cubic meters must be a valid non-negative number",
      },
    },

    fillPercentage: {
      type: Number,
      required: [true, "Fill percentage is required"],
      min: [0, "Fill percentage cannot be negative"],
      max: [100, "Fill percentage cannot exceed 100%"],
      validate: {
        validator: (v) => v !== null && v !== undefined && !isNaN(v) && typeof v === "number" && v >= 0 && v <= 100,
        message: "Fill percentage must be a valid number between 0 and 100",
      },
    },

    massKg: {
      type: Number,
      min: [0, "Mass cannot be negative"],
      validate: {
        validator: (v) => v === null || v === undefined || (!isNaN(v) && typeof v === "number" && v >= 0),
        message: "Mass in kg must be a valid non-negative number or null",
      },
    },

    // Tank snapshot for historical context
    tankSnapshot: {
      name: { type: String },
      shape: { type: String },
      orientation: { type: String },
      dimensions: mongoose.Schema.Types.Mixed,
      capacity: { type: Number },
      offsetDepth: { type: Number },
      materialType: { type: String },
      deviceType: { type: String },
      bulkDensity: { type: Number },
      alertThresholds: {
        low: { type: Number },
        high: { type: Number },
        critical: { type: Number },
      },
      ullage: { type: Number },
    },

    // Material details
    material: {
      name: { type: String },
      category: { type: String },
      properties: mongoose.Schema.Types.Mixed,
    },

    dataQuality: {
      type: String,
      enum: ["excellent", "good", "fair", "poor", "error", "unknown", "manual", "unsupported_shape"],
      default: "unknown",
      index: true,
    },

    qualityScore: {
      type: Number,
      min: [0, "Quality score cannot be negative"],
      max: [100, "Quality score cannot exceed 100"],
      default: 50,
    },

    errors: [
      {
        code: { type: String },
        message: { type: String },
        severity: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
        },
      },
    ],

    processingInfo: {
      processedAt: {
        type: Date,
        default: Date.now,
      },
      processingVersion: {
        type: String,
        default: "2.7-enhanced", // ✅ UPDATED: Version for enhanced processing
      },
      calculationMethod: { type: String },
      sensorType: { type: String },
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      validationPassed: { type: Boolean, default: true },
      error: { type: String },
    },

    source: {
      type: String,
      enum: ["sensor_reading", "manual_adjustment"],
      default: "sensor_reading",
    },

    // Environmental data from sensor reading
    temperature: {
      type: Number,
      min: [-50, "Temperature cannot be below -50°C"],
      max: [100, "Temperature cannot exceed 100°C"],
    },

    humidity: {
      type: Number,
      min: [0, "Humidity cannot be negative"],
      max: [100, "Humidity cannot exceed 100%"],
    },

    batteryLevel: {
      // ✅ RENAMED: From battery_level for consistency
      type: Number,
      min: [0, "Battery level cannot be negative"],
      max: [100, "Battery level cannot exceed 100%"],
    },

    signalRssiDbm: {
      // ✅ RENAMED: From signal_rssi_dbm for consistency
      type: Number,
      min: [-150, "RSSI dBm too low"],
      max: [0, "RSSI dBm cannot be positive"],
    },

    signalRssiRaw: {
      // ✅ RENAMED: From signal_rssi_raw for consistency
      type: Number,
      min: [0, "RSSI raw value cannot be negative"],
      max: [100, "RSSI raw value too high"],
    },

    errorCode: {
      // ✅ ADDED: For sensor error codes
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "tank_volume_history",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Enhanced indexes for better performance
tankVolumeHistorySchema.index({ tankId: 1, timestamp: -1 })
tankVolumeHistorySchema.index({ deviceId: 1, timestamp: -1 })
tankVolumeHistorySchema.index({ deviceSerialNumber: 1, timestamp: -1 })
tankVolumeHistorySchema.index({ timestamp: -1, dataQuality: 1 })
tankVolumeHistorySchema.index({ tankId: 1, fillPercentage: 1, timestamp: -1 })

// Virtual properties
tankVolumeHistorySchema.virtual("age").get(function () {
  return Date.now() - this.timestamp.getTime()
})

tankVolumeHistorySchema.virtual("formattedTimestamp").get(function () {
  return this.timestamp.toISOString()
})

tankVolumeHistorySchema.virtual("volumeGallons").get(function () {
  return this.volumeLiters * 0.264172
})

tankVolumeHistorySchema.virtual("device", {
  ref: "Device",
  localField: "deviceId",
  foreignField: "_id",
  justOne: true,
})

// Static methods
tankVolumeHistorySchema.statics.getLatestByTank = function (tankId) {
  return this.findOne({ tankId }).sort({ timestamp: -1 }).lean()
}

tankVolumeHistorySchema.statics.getHistoryByTank = function (tankId, hours = 24, limit = 100) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)
  return this.find({
    tankId,
    timestamp: { $gte: startTime },
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean()
}

tankVolumeHistorySchema.statics.getAverageByTank = function (tankId, hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)
  return this.aggregate([
    {
      $match: {
        tankId: new mongoose.Types.ObjectId(tankId),
        timestamp: { $gte: startTime },
        dataQuality: { $in: ["excellent", "good", "fair", "manual"] },
      },
    },
    {
      $group: {
        _id: null,
        avgFillPercentage: { $avg: "$fillPercentage" },
        avgVolumeLiters: { $avg: "$volumeLiters" },
        avgLevel: { $avg: "$actualLevel" },
        count: { $sum: 1 },
        minFill: { $min: "$fillPercentage" },
        avgMassKg: { $avg: "$massKg" },
        maxFill: { $max: "$fillPercentage" },
      },
    },
  ])
}

// Instance methods
tankVolumeHistorySchema.methods.isAlertLevel = function () {
  if (!this.tankSnapshot || !this.tankSnapshot.alertThresholds) return "normal" // Default to normal if no thresholds

  const thresholds = this.tankSnapshot.alertThresholds
  if (this.fillPercentage >= (thresholds.critical || 95)) return "critical"
  if (this.fillPercentage >= (thresholds.high || 80)) return "high"
  if (this.fillPercentage <= (thresholds.low || 10)) return "low"
  return "normal"
}


tankVolumeHistorySchema.methods.getAlertLevel = function () {
  if (!this.tankSnapshot || !this.tankSnapshot.alertThresholds) return "normal"

  const thresholds = this.tankSnapshot.alertThresholds
  if (this.fillPercentage >= thresholds.critical) return "critical"
  if (this.fillPercentage >= thresholds.high) return "high"
  if (this.fillPercentage <= thresholds.low) return "low"
  return "normal"
}

// ✅ ENHANCED: Pre-save middleware with better error handling and validation
tankVolumeHistorySchema.pre("save", function (next) {
  console.log(`[TankVolumeHistory] Enhanced pre-save validation for tank: ${this.tankId}`)

  try {
    // Ensure all required numeric fields are valid numbers
    const numericFields = ["rawSensorReading", "actualLevel", "volumeLiters", "volumeM3", "fillPercentage"]

    for (const field of numericFields) {
      if (this[field] !== null && this[field] !== undefined) {
        // Convert to number if it's a string
        if (typeof this[field] === "string") {
          const numValue = Number(this[field])
          if (isNaN(numValue)) {
            const error = new Error(`${field} must be a valid number, got: ${this[field]}`)
            error.name = "ValidationError"
            return next(error)
          }
          this[field] = numValue
        }

        // Validate it's actually a number
        if (isNaN(this[field]) || typeof this[field] !== "number") {
          const error = new Error(`${field} must be a valid number, got: ${this[field]} (type: ${typeof this[field]})`)
          error.name = "ValidationError"
          return next(error)
        }
      }
    }

    // Validate massKg if present
    if (this.massKg !== null && this.massKg !== undefined) {
      if (typeof this.massKg === "string") {
        const numValue = Number(this.massKg)
        if (isNaN(numValue)) {
          const error = new Error(`massKg must be a valid number, got: ${this.massKg}`)
          error.name = "ValidationError"
          return next(error)
        }
        this.massKg = numValue
      }

      if (isNaN(this.massKg) || typeof this.massKg !== "number") {
        const error = new Error(`massKg must be a valid number, got: ${this.massKg} (type: ${typeof this.massKg})`)
        error.name = "ValidationError"
        return next(error)
      }
    }

    // Validate fillPercentage is within bounds
    if (this.fillPercentage < 0 || this.fillPercentage > 100) {
      console.warn(`[TankVolumeHistory] Fill percentage ${this.fillPercentage}% out of bounds, clamping to 0-100%`)
      this.fillPercentage = Math.max(0, Math.min(100, this.fillPercentage))
    }

    // Ensure processingInfo is set and updated
    if (!this.processingInfo) {
      this.processingInfo = {}
    }
    this.processingInfo.processedAt = new Date()
    if (!this.processingInfo.processingVersion) {
      this.processingInfo.processingVersion = "2.7-enhanced"
    }

    console.log(`[TankVolumeHistory] ✅ Enhanced pre-save validation passed for tank: ${this.tankId}`)
    next()
  } catch (error) {
    console.error(`[TankVolumeHistory] Enhanced pre-save validation error:`, error)
    next(error)
  }
})

// Enhanced post-save middleware
tankVolumeHistorySchema.post("save", (doc) => {
  console.log(
    `✅ [TankVolumeHistory] Successfully saved enhanced volume record for tank ${doc.tankId}: ${doc.volumeLiters}L (${doc.fillPercentage.toFixed(2)}%)`,
  )

  if (doc.dataQuality === "error" || doc.errors.length > 0) {
    console.warn(`⚠️ [TankVolumeHistory] Data quality issues for tank ${doc.tankId}:`, {
      quality: doc.dataQuality,
      score: doc.qualityScore,
      errors: doc.errors.length,
      errorDetails: doc.errors,
    })
  }
})

// Enhanced post-save error handling
tankVolumeHistorySchema.post("save", (error, doc, next) => {
  if (error) {
    console.error(`❌ [TankVolumeHistory] Enhanced save error for tank ${doc?.tankId}:`, error.message)
    if (error.name === "ValidationError") {
      console.error(`❌ [TankVolumeHistory] Enhanced validation details:`, error.errors)
    }
  }
  next(error)
})

module.exports = mongoose.model("TankVolumeHistory", tankVolumeHistorySchema)
