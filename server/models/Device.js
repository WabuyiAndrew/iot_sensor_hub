const mongoose = require("mongoose");
const moment = require("moment-timezone");

const DeviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Device name is required"],
    trim: true,
    maxlength: [100, "Device name cannot be more than 100 characters"],
  },
  serialNumber: {
    type: String,
    required: [true, "Serial number is required"],
    unique: true,
    uppercase: true,
    trim: true,
  },
  type: {
    type: String,
    required: [true, "Device type is required"],
    enum: [
      "air_quality",
      "WeatherS",  // ✅ Added WeatherS to replace weather_station
      "Level1",
      "multi_sensor",
      "generic",
      "temperature_humidity_sensor",
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
  status: {
    type: String,
    enum: ["online", "offline", "maintenance"],
    default: "offline",
  },
  isTankCompatible: {
    type: Boolean,
    default: false,
  },
  assignedToUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  tankType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TankType",
    default: null,
  },
  location: {
    type: String,
    trim: true,
  },
  gpsCoordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: undefined,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: undefined,
    },
  },
  firmwareVersion: {
    type: String,
    default: "1.0.0",
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  installationDate: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Pre-save hook to set isTankCompatible based on device type
DeviceSchema.pre('save', function(next) {
  const tankCompatibleTypes = [
    "Level1",
    "radar_level_sensor",
    "pressure_transmitter",
    "submersible_level_sensor",
    "guided_wave_radar",
    "laser_level_sensor",
    "capacitive_level_sensor",
    "load_cell",
    "Level2",
    "multi_sensor",
  ];
  
  this.isTankCompatible = tankCompatibleTypes.includes(this.type);
  next();
});

// Virtual for local creation time
DeviceSchema.virtual("createdAtLocal").get(function () {
  return moment(this.createdAt).tz("America/New_York").format("YYYY-MM-DD HH:mm:ss z");
});

// Static for device stats
DeviceSchema.statics.getDeviceStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalDevices: { $sum: 1 },
        onlineDevices: { $sum: { $cond: [{ $eq: ["$status", "online"] }, 1, 0] } },
        offlineDevices: { $sum: { $cond: [{ $eq: ["$status", "offline"] }, 1, 0] } },
        activeDevices: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
        tankCompatibleDevices: { $sum: { $cond: [{ $eq: ["$isTankCompatible", true] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        totalDevices: 1,
        onlineDevices: 1,
        offlineDevices: 1,
        activeDevices: 1,
        tankCompatibleDevices: 1,
      },
    },
  ]);
  return stats;
};

// ✅ Safe export to prevent OverwriteModelError
module.exports = mongoose.models.Device || mongoose.model("Device", DeviceSchema);