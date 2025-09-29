const mongoose = require("mongoose")
require("dotenv").config()

// Import your existing models
const SensorData = require("../models/SensorData")
const Device = require("../models/Device")

async function testDatabaseConnection() {
  console.log("🔍 [DEBUG] Starting database connection test...")

  try {
    // Test MongoDB connection
    console.log("📡 [DEBUG] Connecting to MongoDB...")
    console.log("📡 [DEBUG] MongoDB URI:", process.env.MONGODB_URI ? "Set" : "NOT SET")

    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ [DEBUG] Connected to MongoDB successfully")

    // Test collection access
    console.log("📊 [DEBUG] Testing collection access...")
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log(
      "📊 [DEBUG] Available collections:",
      collections.map((c) => c.name),
    )

    // Check current data count
    const currentCount = await SensorData.countDocuments()
    console.log("📊 [DEBUG] Current SensorData count:", currentCount)

    // Test data insertion
    console.log("🧪 [DEBUG] Testing data insertion...")
    const testData = {
      deviceId: "test-device-" + Date.now(),
      timestamp: new Date(),
      temperature: 25.5,
      humidity: 60.2,
      pressure: 1013.25,
      metadata: {
        source: "debug-test",
        version: "1.0",
      },
    }

    console.log("🧪 [DEBUG] Test data to insert:", JSON.stringify(testData, null, 2))

    // Insert test data
    const insertResult = await SensorData.create(testData)
    console.log("✅ [DEBUG] Test data inserted successfully")
    console.log("✅ [DEBUG] Inserted document ID:", insertResult._id)

    // Verify insertion
    const verifyCount = await SensorData.countDocuments()
    console.log("📊 [DEBUG] New SensorData count:", verifyCount)

    // Find the inserted document
    const foundDoc = await SensorData.findById(insertResult._id)
    console.log("🔍 [DEBUG] Found inserted document:", foundDoc ? "YES" : "NO")

    // Test bulk insertion (similar to your ingestion process)
    console.log("🧪 [DEBUG] Testing bulk insertion...")
    const bulkTestData = [
      {
        deviceId: "bulk-test-1-" + Date.now(),
        timestamp: new Date(),
        temperature: 22.1,
        humidity: 55.0,
        pressure: 1012.0,
      },
      {
        deviceId: "bulk-test-2-" + Date.now(),
        timestamp: new Date(),
        temperature: 23.5,
        humidity: 58.3,
        pressure: 1014.2,
      },
    ]

    const bulkResult = await SensorData.insertMany(bulkTestData, { ordered: false })
    console.log("✅ [DEBUG] Bulk insert successful. Inserted:", bulkResult.length, "documents")

    // Final count
    const finalCount = await SensorData.countDocuments()
    console.log("📊 [DEBUG] Final SensorData count:", finalCount)

    // Clean up test data
    console.log("🧹 [DEBUG] Cleaning up test data...")
    await SensorData.deleteMany({
      $or: [{ deviceId: { $regex: /^test-device-/ } }, { deviceId: { $regex: /^bulk-test-/ } }],
    })

    const cleanupCount = await SensorData.countDocuments()
    console.log("🧹 [DEBUG] Count after cleanup:", cleanupCount)

    console.log("🎉 [DEBUG] All tests completed successfully!")
  } catch (error) {
    console.error("❌ [DEBUG] Error during testing:", error)
    console.error("❌ [DEBUG] Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    })
  } finally {
    await mongoose.connection.close()
    console.log("🔌 [DEBUG] Database connection closed")
  }
}

// Run the test
testDatabaseConnection()
