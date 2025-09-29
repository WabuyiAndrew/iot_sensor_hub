const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
  },
  deviceType: {
    type: String,
    required: true,
  },
  // Store the full processed analytics for each sensor reading
  metrics: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  dataQuality: {
    type: Number,
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  }
});

// Create a compound index for fast queries by device and timestamp
AnalyticsSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
