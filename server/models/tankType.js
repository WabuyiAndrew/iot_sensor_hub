
const mongoose = require("mongoose")
const { convertSensorReadingToLevel, calculateTankVolume } = require("../services/volumeProcessor") // Utility functions for calculations

// ✅ Role: Defines the schema for a TankType, including its physical dimensions, material, shape, and capacity.
// It also contains the core method 'calculateVolumeFromLevel' to compute tank volume.
const enhancedTankTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tank name is required"],
      unique: true,
      trim: true,
      maxlength: [100, "Tank name cannot exceed 100 characters"],
      index: true,
    },

    materialType: {
      type: String,
      enum: {
        values: ["liquid", "solid", "gas", "mixed"],
        message: "Material type must be liquid, solid, gas, or mixed",
      },
      default: "liquid",
      required: [true, "Material type is required"],
      index: true,
    },

    shape: {
      type: String,
      enum: {
        values: [
          "cylindrical",
          "rectangular",
          "spherical",
          "conical",
          "silo",
          "horizontal_oval",
          "vertical_oval",
          "horizontal_capsule",
          "vertical_capsule",
          "horizontal_elliptical",
          "dish_ends",
          "custom",
        ],
        message: "Invalid tank shape",
      },
      default: "cylindrical",
      required: [true, "Tank shape is required"],
      index: true,
    },

    orientation: {
      type: String,
      enum: {
        values: ["vertical", "horizontal"],
        message: "Orientation must be vertical or horizontal",
      },
      default: "vertical",
    },

    // Enhanced dimensions with comprehensive validation
    dimensions: {
      height: {
        type: Number,
        min: [0.1, "Height must be at least 0.1 meters"],
        max: [100, "Height cannot exceed 100 meters"],
        validate: {
          validator: (v) => v === null || v === undefined || (typeof v === "number" && !isNaN(v) && v > 0),
          message: "Height must be a positive number",
        },
      },
      diameter: {
        type: Number,
        min: [0.1, "Diameter must be at least 0.1 meters"],
        max: [50, "Diameter cannot exceed 50 meters"],
        validate: {
          validator: (v) => v === null || v === undefined || (typeof v === "number" && !isNaN(v) && v > 0),
          message: "Diameter must be a positive number",
        },
      },
      length: {
        type: Number,
        min: [0.1, "Length must be at least 0.1 meters"],
        max: [100, "Length cannot exceed 100 meters"],
      },
      width: {
        type: Number,
        min: [0.1, "Width must be at least 0.1 meters"],
        max: [100, "Width cannot exceed 100 meters"],
      },
      radius: {
        type: Number,
        min: [0.05, "Radius must be at least 0.05 meters"],
        max: [25, "Radius cannot exceed 25 meters"],
      },
      totalHeight: {
        type: Number,
        min: [0.1, "Total height must be at least 0.1 meters"],
        max: [100, "Total height cannot exceed 100 meters"],
      },
      // Additional dimensions for complex shapes
      majorAxis: { type: Number, min: 0.1, max: 100 },
      minorAxis: { type: Number, min: 0.1, max: 100 },
      capsuleLength: { type: Number, min: 0, max: 100 },
      dishRadius: { type: Number, min: 0.1, max: 50 },
      coneAngle: { type: Number, min: 0, max: 90 },
      outletDiameter: { type: Number, min: 0.01, max: 10 },
      groundClearance: { type: Number, min: 0, max: 10 },
      ullage: { type: Number, min: 0, max: 10 }, // Space from top of tank to liquid surface
      coneHeight: { type: Number, min: 0, max: 50 }, // ✅ ADDED: For silo calculations
      coneBottomRadius: { type: Number, min: 0, max: 25 }, // ✅ ADDED: For silo calculations
    },

    capacity: {
      type: Number,
      required: [true, "Tank capacity is required"],
      min: [1, "Capacity must be at least 1 liter"],
      max: [10000000, "Capacity cannot exceed 10,000,000 liters"],
      validate: {
        validator: (v) => typeof v === "number" && !isNaN(v) && v > 0,
        message: "Capacity must be a positive number",
      },
    },

    offsetDepth: {
      type: Number,
      min: [0, "Offset depth cannot be negative"],
      max: [10, "Offset depth cannot exceed 10 meters"],
      default: 0,
    },

    bulkDensity: {
      type: Number,
      min: [0.1, "Bulk density must be at least 0.1 kg/m³"],
      max: [10000, "Bulk density cannot exceed 10,000 kg/m³"],
      validate: {
        validator: function (v) {
          // Only required for solid materials
          if (this.materialType === "solid") {
            return v !== null && v !== undefined && v > 0
          }
          return v === null || v === undefined || v > 0
        },
        message: "Bulk density is required for solid materials and must be positive",
      },
    },

    deviceType: {
      type: String,
      enum: {
        values: [
          "level2",
          "radar_level_sensor",
          "laser_level_sensor",
          "pressure_transmitter",
          "Level1",
          "float_switch",
          "capacitive_level_sensor",
          "vibrating_fork",
          "load_cell",
          "other",
        ],
        message: "Invalid device type",
      },
      required: [true, "Device type is required"],
    },

    alertThresholds: {
      low: {
        type: Number,
        min: [0, "Low threshold cannot be negative"],
        max: [100, "Low threshold cannot exceed 100%"],
        default: 10,
      },
      high: {
        type: Number,
        min: [0, "High threshold cannot be negative"],
        max: [100, "High threshold cannot exceed 100%"],
        default: 80,
      },
      critical: {
        type: Number,
        min: [0, "Critical threshold cannot be negative"],
        max: [100, "Critical threshold cannot exceed 100%"],
        default: 95,
      },
    },

    // Current status fields with validation
    currentVolumeLiters: {
      type: Number,
      default: 0,
      min: [0, "Current volume cannot be negative"],
      validate: {
        validator: function (v) {
          return v <= this.capacity
        },
        message: "Current volume cannot exceed tank capacity",
      },
    },

    currentFillPercentage: {
      type: Number,
      default: 0,
      min: [0, "Fill percentage cannot be negative"],
      max: [100, "Fill percentage cannot exceed 100%"],
    },

    effectiveLiquidHeight: { // Added to store the calculated effective liquid height
      type: Number,
      default: 0,
      min: [0, "Effective liquid height cannot be negative"],
    },

    location: {
      type: String,
      trim: true,
      maxlength: [200, "Location cannot exceed 200 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      default: null,
      index: true,
      validate: {
        validator: async (deviceId) => {
          if (!deviceId) return true

          try {
            const Device = mongoose.model("Device")
            const device = await Device.findById(deviceId)
            return !!device
          } catch (error) {
            console.error("Error validating device reference:", error)
            return false
          }
        },
        message: "Referenced device does not exist",
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Additional metadata
    lastCalibrated: {
      type: Date,
    },

    calibrationNotes: {
      type: String,
      maxlength: [500, "Calibration notes cannot exceed 500 characters"],
    },

    lastVolumeUpdate: {
      type: Date,
      default: null,
    },

    maintenanceSchedule: {
      lastMaintenance: Date,
      nextMaintenance: Date,
      maintenanceInterval: {
        type: Number,
        min: [1, "Maintenance interval must be at least 1 day"],
        max: [365, "Maintenance interval cannot exceed 365 days"],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Enhanced indexes for better performance
enhancedTankTypeSchema.index({ name: 1 })
enhancedTankTypeSchema.index({ materialType: 1, isActive: 1 })
enhancedTankTypeSchema.index({ device: 1 })
enhancedTankTypeSchema.index({ createdBy: 1, isActive: 1 })
enhancedTankTypeSchema.index({ createdAt: -1 })
enhancedTankTypeSchema.index({ shape: 1, orientation: 1 })
enhancedTankTypeSchema.index({ currentFillPercentage: 1 })

// Enhanced virtual properties
enhancedTankTypeSchema.virtual("fillStatus").get(function () {
  const percentage = this.currentFillPercentage || 0
  const thresholds = this.alertThresholds || {}

  if (percentage >= (thresholds.critical || 95)) return "critical"
  if (percentage >= (thresholds.high || 80)) return "high"
  if (percentage <= (thresholds.low || 10)) return "low"
  return "normal"
})

enhancedTankTypeSchema.virtual("volumeUtilization").get(function () {
  return {
    current: this.currentVolumeLiters || 0,
    capacity: this.capacity,
    available: Math.max(0, this.capacity - (this.currentVolumeLiters || 0)),
    percentage: this.currentFillPercentage || 0,
  }
})

// ✅ ENHANCED: Pre-save middleware with comprehensive validation but NO automatic fill percentage calculation
enhancedTankTypeSchema.pre("save", function (next) {
  const errors = []

  try {
    console.log(`[TankType] Enhanced pre-save validation for tank: ${this.name}`)

    // Shape-specific dimension validation
    this.validateDimensionsForShape(errors)

    // Alert threshold validation
    this.validateAlertThresholds(errors)

    // Device type compatibility validation
    this.validateDeviceTypeCompatibility(errors)

    // Current volume validation (clamping values)
    this.validateCurrentVolume()

    // ✅ CRITICAL: DO NOT automatically recalculate fill percentage here
    // This should ONLY be done by the volume processor to avoid conflicts
    // The volume processor handles the relationship between volume and percentage

    // Add logging for dimension changes
    if (this.isModified("dimensions")) {
      console.log(`[TankType] Dimensions modified for tank ${this.name}:`)
      console.log(`[TankType] New dimensions:`, JSON.stringify(this.dimensions, null, 2))
    }

    if (this.isModified("shape")) {
      console.log(`[TankType] Shape changed for tank ${this.name}: ${this.shape}`)
    }

    if (this.isModified("capacity")) {
      console.log(`[TankType] Capacity changed for tank ${this.name}: ${this.capacity}L`)
    }

    if (this.isModified("offsetDepth")) {
      console.log(`[TankType] Offset depth changed for tank ${this.name}: ${this.offsetDepth}m`)
    }

    if (errors.length > 0) {
      const validationError = new Error(errors.join(". "))
      validationError.name = "ValidationError"
      return next(validationError)
    }

    next()
  } catch (error) {
    console.error(`[TankType] Enhanced pre-save validation error:`, error)
    next(error)
  }
})

// Enhanced instance methods
enhancedTankTypeSchema.methods.validateDimensionsForShape = function (errors) {
  const { shape, dimensions } = this

  if (!dimensions || typeof dimensions !== "object") {
    errors.push("Tank dimensions object is required")
    return
  }

  const isInvalid = (value) => value === undefined || value === null || Number(value) <= 0 || isNaN(Number(value))

  console.log(`[TankType] Validating dimensions for ${shape} tank:`, JSON.stringify(dimensions, null, 2))

  switch (shape) {
    case "cylindrical":
      if (isInvalid(dimensions.diameter) && isInvalid(dimensions.radius)) {
        errors.push("Cylindrical tanks require diameter or radius")
      }
      if (isInvalid(dimensions.height) && isInvalid(dimensions.totalHeight)) {
        errors.push("Cylindrical tanks require height or totalHeight")
      }
      break

    case "rectangular":
      if (isInvalid(dimensions.length)) errors.push("Rectangular tanks require length")
      if (isInvalid(dimensions.width)) errors.push("Rectangular tanks require width")
      if (isInvalid(dimensions.height)) errors.push("Rectangular tanks require height")
      break

    case "spherical":
      if (isInvalid(dimensions.radius) && isInvalid(dimensions.diameter)) {
        errors.push("Spherical tanks require radius or diameter")
      }
      break

    case "silo":
      if (isInvalid(dimensions.diameter)) errors.push("Silo tanks require diameter")
      if (isInvalid(dimensions.totalHeight)) errors.push("Silo tanks require total height")
      if (this.materialType !== "solid") errors.push("Silo tanks must have 'solid' material type")
      if (isInvalid(this.bulkDensity)) errors.push("Silo tanks require bulk density")
      break

    // Add other shape validations...
  }

  if (errors.length > 0) {
    console.warn(`[TankType] Dimension validation errors for ${shape} tank:`, errors)
  } else {
    console.log(`[TankType] ✅ Dimension validation passed for ${shape} tank`)
  }
}

enhancedTankTypeSchema.methods.validateAlertThresholds = function (errors) {
  const { low, high, critical } = this.alertThresholds || {}

  if (low >= high) errors.push("Low threshold must be less than high threshold")
  if (high >= critical) errors.push("High threshold must be less than critical threshold")
  if (low >= critical) errors.push("Low threshold must be less than critical threshold")
}

enhancedTankTypeSchema.methods.validateDeviceTypeCompatibility = function (errors) {
  const deviceNeedsOffset = ["level2", "radar_level_sensor", "laser_level_sensor"]

  if (deviceNeedsOffset.includes(this.deviceType)) {
    if (this.offsetDepth === undefined || this.offsetDepth === null || this.offsetDepth < 0) {
      errors.push(`${this.deviceType} requires a valid offset depth`)
    }
  }
}

enhancedTankTypeSchema.methods.validateCurrentVolume = function () {
  if (this.currentVolumeLiters > this.capacity) {
    this.currentVolumeLiters = this.capacity
  }
  if (this.currentVolumeLiters < 0) {
    this.currentVolumeLiters = 0
  }
}

// ✅ UPDATED calculateVolumeFromLevel METHOD TO USE EXTERNAL FUNCTIONS
enhancedTankTypeSchema.methods.calculateVolumeFromLevel = function (
  rawSensorReading,
  sensorType,
  sensorConfig = {},
  totalTankHeight,
  tankOffsetDepth = 0,
  deviceCalibrationOffset = 0,
) {
  console.log(`[Enhanced Tank Model] Processing for tank: ${this.name}`)
  console.log(`[Enhanced Tank Model] Raw sensor reading: ${rawSensorReading}, Sensor Type: ${sensorType}`)

  if (!this.dimensions) {
    console.error(`[Enhanced Tank Model] Tank dimensions are missing for ${this.name}. Cannot calculate volume.`)
    return 0
  }

  const effectiveTankHeight =
    totalTankHeight || this.dimensions.totalHeight || this.dimensions.height || this.dimensions.diameter

  if (!effectiveTankHeight || effectiveTankHeight <= 0) {
    console.error(
      `[Enhanced Tank Model] Invalid effective tank height: ${effectiveTankHeight} for ${this.name}. Returning 0L.`,
    )
    return 0
  }

  // 1. Convert raw sensor reading to liquid level (in meters)
  const liquidLevelMeters = convertSensorReadingToLevel(
    rawSensorReading,
    sensorType || this.deviceType,
    sensorConfig,
    effectiveTankHeight,
    tankOffsetDepth || this.offsetDepth,
    deviceCalibrationOffset,
  )

  console.log(`[Enhanced Tank Model] Converted liquid level: ${liquidLevelMeters}m`)

  // 2. Calculate tank volume based on liquid level
  const { currentVolume: volumeM3, calculationMethod } = calculateTankVolume(
    this.shape,
    this.orientation,
    this.dimensions,
    liquidLevelMeters,
    this.ullage,
  )

  // Convert to liters and clamp to tank capacity
  const volumeLiters = Math.round(volumeM3 * 1000)
  const finalVolume = Math.min(volumeLiters, this.capacity)

  console.log(`[Enhanced Tank Model] Calculated final volume: ${finalVolume}L (Method: ${calculationMethod})`)
  return finalVolume
}

enhancedTankTypeSchema.methods.calculateTheoreticalVolume = function () {
  const effectiveHeight = this.dimensions.totalHeight || this.dimensions.height || this.dimensions.diameter

  const { currentVolume: volumeM3 } = calculateTankVolume(
    this.shape,
    this.orientation,
    this.dimensions,
    effectiveHeight,
    this.ullage,
  )
  return Math.round(volumeM3 * 1000)
}

// Static methods for analytics
enhancedTankTypeSchema.statics.getTankStatistics = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalTanks: { $sum: 1 },
        activeTanks: { $sum: { $cond: ["$isActive", 1, 0] } },
        totalCapacity: { $sum: "$capacity" },
        totalCurrentVolume: { $sum: "$currentVolumeLiters" },
        avgFillPercentage: { $avg: "$currentFillPercentage" },
        shapeDistribution: { $push: "$shape" },
        materialDistribution: { $push: "$materialType" },
      },
    },
  ])
}

enhancedTankTypeSchema.statics.getAlertTanks = function () {
  return this.find({
    isActive: true,
    $or: [
      { currentFillPercentage: { $lte: "$alertThresholds.low" } },
      { currentFillPercentage: { $gte: "$alertThresholds.high" } },
    ],
  }).populate("device", "name serialNumber status")
}

// ✅ ENHANCED: Post-save middleware to ensure device relationship consistency
enhancedTankTypeSchema.post("save", async (doc) => {
  try {
    if (doc.device) {
      const Device = mongoose.model("Device")
      await Device.findByIdAndUpdate(doc.device, { tankType: doc._id })
      console.log(`[TankType] Updated device ${doc.device} to reference tank ${doc._id}`)
    }
  } catch (error) {
    console.error(`[TankType] Error updating device relationship:`, error)
  }
})

module.exports = mongoose.model("TankType", enhancedTankTypeSchema)
