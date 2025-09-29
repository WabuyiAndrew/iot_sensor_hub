const mongoose = require("mongoose")
const DebugIngestionService = require("../services/debugIngestionService")
const SensorData = require("../models/SensorData")

async function runManualDebugTest() {
  try {
    console.log("🔧 [Manual Debug] Starting comprehensive debug test...")

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://your-connection-string")
    console.log("✅ [Manual Debug] Connected to database")

    // Test 1: Database connection and access
    console.log("\n--- Test 1: Database Connection ---")
    const dbTest = await DebugIngestionService.testDatabaseConnection()
    console.log("Database test result:", dbTest)

    // Test 2: Check current data
    console.log("\n--- Test 2: Current Data Check ---")
    const totalCount = await SensorData.countDocuments()
    console.log(`Total SensorData records: ${totalCount}`)

    const recentRecords = await SensorData.find().sort({ createdAt: -1 }).limit(5).lean()
    console.log(`Most recent records (${recentRecords.length}):`, recentRecords)

    // Test 3: Manual insertion test
    console.log("\n--- Test 3: Manual Insertion Test ---")
    const testData = [
      {
        deviceId: new mongoose.Types.ObjectId(),
        timestamp: new Date(),
        temperature: 23.5,
        humidity: 65.2,
        pressure: 1013.25,
        testRecord: true,
        source: "manual-debug-test",
      },
    ]

    const insertResult = await DebugIngestionService.debugInsertMany(testData, "TEST-DEVICE")
    console.log("Manual insertion result:", insertResult)

    // Test 4: Verify insertion
    console.log("\n--- Test 4: Verify Insertion ---")
    const afterCount = await SensorData.countDocuments()
    console.log(`Total records after test: ${afterCount}`)

    const testRecords = await SensorData.find({ testRecord: true }).lean()
    console.log(`Test records found: ${testRecords.length}`)

    // Cleanup test records
    await SensorData.deleteMany({ testRecord: true })
    console.log("✅ [Manual Debug] Test records cleaned up")

    console.log("\n✅ [Manual Debug] All tests completed")
  } catch (error) {
    console.error("❌ [Manual Debug] Test failed:", error)
  } finally {
    await mongoose.disconnect()
    console.log("🔌 [Manual Debug] Disconnected from database")
  }
}

// Run the test
runManualDebugTest()
