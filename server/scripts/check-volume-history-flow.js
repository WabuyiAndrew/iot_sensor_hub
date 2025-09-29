// Script to check the complete volume history flow
const mongoose = require("mongoose")

async function checkVolumeHistoryFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tank-monitoring")
    console.log("🔗 Connected to MongoDB")

    const SensorData = mongoose.model("SensorData")
    const TankVolumeHistory = mongoose.model("TankVolumeHistory")
    const Device = mongoose.model("Device")

    // Find a device with a tank
    const device = await Device.findOne({ tankType: { $ne: null } }).populate("tankType")
    if (!device) {
      console.error("❌ No devices with tanks found")
      return
    }

    console.log(`📱 Using device: ${device.name} (${device.serialNumber})`)
    console.log(`🪣 Tank: ${device.tankType.name}`)

    // Count existing volume history records
    const existingCount = await TankVolumeHistory.countDocuments({ deviceId: device._id })
    console.log(`📊 Existing volume history records: ${existingCount}`)

    // Create test sensor data that should trigger volume calculation
    const testSensorData = {
      deviceId: device._id,
      sensorId: device.serialNumber,
      sensorType: "ultrasonic_level_sensor",
      timestamp: new Date(),
      ultrasonic_liquid_level: 1.5, // 1.5 meters from sensor
      temperature: 25,
      humidity: 60,
      signal_rssi_dbm: -70,
      battery_level: 85,
      error_code: 0,
      dataQuality: "good",
      source: "test-script",
    }

    console.log("📡 Creating test sensor data...")
    const sensorRecord = new SensorData(testSensorData)
    const savedSensorData = await sensorRecord.save()

    console.log("✅ Sensor data saved:", savedSensorData._id)
    console.log("⏳ Waiting for post-save processing...")

    // Wait a moment for post-save processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Check if volume history was created
    const newCount = await TankVolumeHistory.countDocuments({ deviceId: device._id })
    console.log(`📊 Volume history records after sensor save: ${newCount}`)

    if (newCount > existingCount) {
      console.log("✅ SUCCESS: Volume history record was created!")

      // Get the latest record
      const latestRecord = await TankVolumeHistory.findOne({ deviceId: device._id }).sort({ timestamp: -1 })

      console.log("📋 Latest volume record:")
      console.log(`   Volume: ${latestRecord.volumeLiters}L`)
      console.log(`   Fill: ${latestRecord.fillPercentage.toFixed(2)}%`)
      console.log(`   Quality: ${latestRecord.dataQuality}`)
      console.log(`   Timestamp: ${latestRecord.timestamp}`)
    } else {
      console.error("❌ FAILURE: No new volume history record was created")

      // Check if sensor data was marked as processed
      const processedSensorData = await SensorData.findById(savedSensorData._id)
      console.log("🔍 Sensor data processed flag:", processedSensorData.processed)
      console.log("🔍 Sensor data quality:", processedSensorData.dataQuality)
    }

    // Check recent sensor data processing
    const recentSensorData = await SensorData.find({
      deviceId: device._id,
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
    })
      .sort({ timestamp: -1 })
      .limit(5)

    console.log(`\n📊 Recent sensor data (${recentSensorData.length} records):`)
    recentSensorData.forEach((record, index) => {
      console.log(
        `   ${index + 1}. ${record.timestamp.toISOString()} - Quality: ${record.dataQuality}, Processed: ${record.processed}`,
      )
    })
  } catch (error) {
    console.error("❌ Flow check failed:", error)
    console.error("Stack:", error.stack)
  } finally {
    await mongoose.disconnect()
    console.log("🔌 Disconnected from MongoDB")
  }
}

// Run the check
checkVolumeHistoryFlow()
