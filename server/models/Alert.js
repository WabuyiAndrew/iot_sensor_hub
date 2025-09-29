// backend/models/Alert.js
const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    // Reference to the device that triggered the alert
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: [true, "Device ID is required for an alert"],
      index: true,
    },
    // Optional: Reference to the user associated with the device (for easier filtering)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    // Type of alert (e.g., 'low_volume', 'offline', 'battery_low', 'high_temperature')
    type: {
      type: String,
      required: [true, "Alert type is required"],
      enum: [
        "low_volume",
        "high_volume",
        "critical_volume",
        "offline",
        "battery_low",
        "high_temperature",
        "low_temperature",
        "sensor_error",
        "maintenance_due",
        "device_tamper",
        "other",
      ],
      default: "other",
      index: true,
    },
    // Severity of the alert
    severity: {
      type: String,
      required: [true, "Alert severity is required"],
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    // Human-readable message for the alert
    message: {
      type: String,
      required: [true, "Alert message is required"],
      maxlength: [500, "Alert message cannot exceed 500 characters"],
    },
    // Current status of the alert
    status: {
      type: String,
      enum: ["active", "acknowledged", "resolved"],
      default: "active",
      index: true,
    },
    // Timestamp when the alert was first triggered
    triggeredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Optional: Timestamp when the alert was last updated (e.g., status change)
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    // Optional: User who acknowledged or resolved the alert
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Optional: Timestamp when the alert was acknowledged
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    // Optional: Timestamp when the alert was resolved
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Additional data related to the alert (e.g., volume level at time of alert)
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Any notes or comments on the alert
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: "",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: "alerts", // Explicitly name the collection
  }
);

// Indexes for common queries
alertSchema.index({ deviceId: 1, status: 1, triggeredAt: -1 });
alertSchema.index({ userId: 1, status: 1, triggeredAt: -1 });
alertSchema.index({ severity: 1, status: 1 });

// Middleware to update lastUpdated and acknowledgedAt/resolvedAt
alertSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  if (this.isModified("status")) {
    if (this.status === "acknowledged" && !this.acknowledgedAt) {
      this.acknowledgedAt = new Date();
    }
    if (this.status === "resolved" && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
  }
  next();
});

module.exports = mongoose.model("Alert", alertSchema);
