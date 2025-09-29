const mongoose = require("mongoose")

const alertThresholdSchema = new mongoose.Schema(
  {
    parameter: {
      type: String,
      required: [true, "Parameter is required"],
      unique: true,
      trim: true,
      enum: [
        "temperature",
        "humidity", 
        "pm25",
        "pm10", 
        "co2",
        "atmosphericPressure",
        "windSpeed",
        "windDir",
        "rainfall",
        "totalSolarRadiation",
        "noise",
        "ultrasonic_liquid_level",
        "pressure_level",
        "liquid_level_raw",
        "signalStrength",
      ],
    },
    warningThreshold: {
      type: Number,
      default: null,
      validate: {
        validator: function(v) {
          // Allow null values or valid numbers
          return v === null || !isNaN(v)
        },
        message: "Warning threshold must be a valid number"
      }
    },
    criticalThreshold: {
      type: Number,
      default: null,
      validate: {
        validator: function(v) {
          // Allow null values or valid numbers
          return v === null || !isNaN(v)
        },
        message: "Critical threshold must be a valid number"
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Compound index for efficient queries
alertThresholdSchema.index({ parameter: 1, isActive: 1 })
alertThresholdSchema.index({ createdBy: 1 })
alertThresholdSchema.index({ isActive: 1 })

// Pre-save validation
alertThresholdSchema.pre("save", function (next) {
  // Ensure at least one threshold is set
  if (this.warningThreshold === null && this.criticalThreshold === null) {
    return next(new Error("At least one threshold (warning or critical) must be set"))
  }
  
  // Validate logical threshold relationship
  if (this.warningThreshold !== null && this.criticalThreshold !== null) {
    if (this.warningThreshold >= this.criticalThreshold) {
      return next(new Error("Warning threshold should be less than critical threshold"))
    }
  }
  
  next()
})

// Static method to get default thresholds
alertThresholdSchema.statics.getDefaultThresholds = function () {
  return [
    {
      parameter: "temperature",
      warningThreshold: 35,
      criticalThreshold: 40,
      description: "Temperature monitoring for environmental safety",
      isActive: true,
    },
    {
      parameter: "humidity",
      warningThreshold: 70,
      criticalThreshold: 85,
      description: "Humidity levels for comfort and equipment safety",
      isActive: true,
    },
    {
      parameter: "pm25",
      warningThreshold: 35,
      criticalThreshold: 55,
      description: "PM2.5 air quality monitoring",
      isActive: true,
    },
    {
      parameter: "co2",
      warningThreshold: 1000,
      criticalThreshold: 5000,
      description: "CO2 concentration monitoring",
      isActive: true,
    },
  ]
}

// Virtual for threshold status
alertThresholdSchema.virtual("status").get(function () {
  if (!this.isActive) return "inactive"
  if (this.warningThreshold === null && this.criticalThreshold === null) return "not_configured"
  return "active"
})

// Method to check if a value triggers an alert
alertThresholdSchema.methods.checkValue = function(value) {
  if (!this.isActive) return null
  
  if (this.criticalThreshold !== null && value >= this.criticalThreshold) {
    return { level: "critical", threshold: this.criticalThreshold }
  }
  
  if (this.warningThreshold !== null && value >= this.warningThreshold) {
    return { level: "warning", threshold: this.warningThreshold }
  }
  
  return null
}

module.exports = mongoose.model("AlertThreshold", alertThresholdSchema)