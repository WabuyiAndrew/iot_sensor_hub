require("dotenv").config()
const mongoose = require("mongoose")
const Device = require("../models/Device")
const SensorData = require("../models/SensorData")

async function testDeviceMapping() {
  try {
    console.log("🔌 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Test device lookup
    console.log("\n🔍 Testing device lookup...")
    const devices = await Device.find().limit(3)
    console.log(`Found ${devices.length} devices:`)
    devices.forEach((device) => {
      console.log(`  - ID: ${device._id}, Serial: ${device.serialNumber}, Type: ${device.type}`)
    })

    // Test sensor data insertion with proper deviceId
    if (devices.length > 0) {
      const testDevice = devices[0]
      console.log(`\n📊 Testing sensor data insertion for device: ${testDevice.serialNumber}`)

      const testSensorData = {
        deviceId: testDevice._id, // Proper ObjectId
        sensorId: testDevice.serialNumber, // Device serial maps to sensorId
        timestamp: new Date(),
        data: {
          deviceNumber: testDevice.serialNumber,
          session: "test-session",
          order: "1",
          body: {
            temperature: 25.5,
            humidity: 60.2,
          },
        },
        temperature: 25.5,
        humidity: 60.2,
        status: "online",
        // Note: sensorType is now optional, so we don't include it
      }

      const result = await SensorData.create(testSensorData)
      console.log("✅ Test sensor data inserted successfully:", result._id)

      // Clean up test data
      await SensorData.deleteOne({ _id: result._id })
      console.log("🧹 Test data cleaned up")
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message)
    if (error.errors) {
      Object.keys(error.errors).forEach((field) => {
        console.error(`   - ${field}: ${error.errors[field].message}`)
      })
    }
  } finally {
    await mongoose.disconnect()
    console.log("🔌 Disconnected from MongoDB")
  }
}

testDeviceMapping()
