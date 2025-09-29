const mongoose = require("mongoose")
require("dotenv").config()

const SensorData = require("../models/SensorData")

async function checkIngestionIssues() {
  console.log("🔍 [DEBUG] Checking for ingestion issues...")

  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ [DEBUG] Connected to MongoDB")

    // Check total documents
    const totalDocs = await SensorData.countDocuments()
    console.log("📊 [DEBUG] Total documents in SensorData:", totalDocs)

    // Check recent documents (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentDocs = await SensorData.countDocuments({
      timestamp: { $gte: yesterday },
    })
    console.log("📊 [DEBUG] Documents from last 24 hours:", recentDocs)

    // Check unique devices
    const uniqueDevices = await SensorData.distinct("deviceId")
    console.log("📊 [DEBUG] Unique devices:", uniqueDevices.length)
    console.log("📊 [DEBUG] Device IDs:", uniqueDevices)

    // Sample recent documents
    const sampleDocs = await SensorData.find().sort({ timestamp: -1 }).limit(5).lean()

    console.log("📊 [DEBUG] Sample recent documents:")
    sampleDocs.forEach((doc, index) => {
      console.log(`  ${index + 1}. Device: ${doc.deviceId}, Time: ${doc.timestamp}, Temp: ${doc.temperature}`)
    })

    // Check for validation errors by trying to insert invalid data
    console.log("🧪 [DEBUG] Testing schema validation...")
    try {
      await SensorData.create({
        // Missing required fields to test validation
        invalidField: "test",
      })
    } catch (validationError) {
      console.log("✅ [DEBUG] Schema validation is working:", validationError.message)
    }
  } catch (error) {
    console.error("❌ [DEBUG] Error:", error)
  } finally {
    await mongoose.connection.close()
  }
}

checkIngestionIssues()
