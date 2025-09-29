// Script to test TankVolumeHistory creation manually
const mongoose = require("mongoose")

async function testVolumeHistoryCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tank-monitoring")
    console.log("🔗 Connected to MongoDB for testing")

    const TankVolumeHistory = mongoose.model("TankVolumeHistory")
    const Device = mongoose.model("Device")
    const TankType = mongoose.model("TankType")

    // Find a test device and tank
    const device = await Device.findOne().populate("tankType")
    if (!device) {
      console.error("❌ No devices found for testing")
      return
    }

    if (!device.tankType) {
      console.error("❌ Device has no tank assigned")
      return
    }

    console.log(`📱 Using device: ${device.name} (${device.serialNumber})`)
    console.log(`🪣 Using tank: ${device.tankType.name}`)

    // Create test volume history record
    const testVolumeData = {
      tankId: device.tankType._id,
      deviceId: device._id,
      deviceSerialNumber: device.serialNumber,
      timestamp: new Date(),
      rawSensorReading: 1.5,
      actualLevel: 2.5,
      volumeLiters: 1000,
      volumeM3: 1.0,
      fillPercentage: 50,

      tankSnapshot: {
        name: device.tankType.name,
        shape: device.tankType.shape,
        orientation: device.tankType.orientation,
        dimensions: device.tankType.dimensions,
        capacity: device.tankType.capacity,
        offsetDepth: device.tankType.offsetDepth,
        materialType: device.tankType.materialType,
        deviceType: device.tankType.deviceType,
        bulkDensity: device.tankType.bulkDensity,
        alertThresholds: device.tankType.alertThresholds,
      },

      dataQuality: "good",
      qualityScore: 85,

      processingInfo: {
        processedAt: new Date(),
        processingVersion: "2.6",
        calculationMethod: device.tankType.shape,
        sensorType: device.type,
        validationPassed: true,
      },

      source: "sensor_reading",
    }

    console.log("📋 Creating test TankVolumeHistory record...")
    console.log("Data:", JSON.stringify(testVolumeData, null, 2))

    const volumeRecord = new TankVolumeHistory(testVolumeData)
    const savedRecord = await volumeRecord.save()

    console.log("✅ Test TankVolumeHistory record created successfully!")
    console.log("Record ID:", savedRecord._id)
    console.log("Volume:", savedRecord.volumeLiters, "L")
    console.log("Fill:", savedRecord.fillPercentage, "%")

    // Verify it was saved
    const foundRecord = await TankVolumeHistory.findById(savedRecord._id)
    if (foundRecord) {
      console.log("✅ Record verification successful - found in database")
    } else {
      console.error("❌ Record verification failed - not found in database")
    }
  } catch (error) {
    console.error("❌ Test failed:", error)
    if (error.name === "ValidationError") {
      console.error("❌ Validation errors:", error.errors)
    }
  } finally {
    await mongoose.disconnect()
    console.log("🔌 Disconnected from MongoDB")
  }
}

// Run the test
testVolumeHistoryCreation()
