const SensorData = require("../models/SensorData")
const Device = require("../models/Device")
const mongoose = require("mongoose")

/**
 * Enhanced debugging service for sensor data ingestion
 */
class DebugIngestionService {
  /**
   * Test database connection and collection access
   */
  static async testDatabaseConnection() {
    try {
      console.log("🔍 [Debug] Testing database connection...")

      // Test basic connection
      const connectionState = mongoose.connection.readyState
      console.log(`🔍 [Debug] Mongoose connection state: ${connectionState} (1=connected, 0=disconnected)`)

      // Test collection access
      const collections = await mongoose.connection.db.listCollections().toArray()
      console.log(
        "🔍 [Debug] Available collections:",
        collections.map((c) => c.name),
      )

      // Test SensorData model
      const sensorDataCount = await SensorData.countDocuments()
      console.log(`🔍 [Debug] Current SensorData count: ${sensorDataCount}`)

      // Test a simple insert
      const testData = {
        deviceId: new mongoose.Types.ObjectId(),
        timestamp: new Date(),
        temperature: 25.5,
        humidity: 60.0,
        testRecord: true,
      }

      const testInsert = await SensorData.create(testData)
      console.log("🔍 [Debug] Test insert successful:", testInsert._id)

      // Clean up test record
      await SensorData.deleteOne({ _id: testInsert._id })
      console.log("🔍 [Debug] Test record cleaned up")

      return { success: true, connectionState, collections: collections.length }
    } catch (error) {
      console.error("❌ [Debug] Database test failed:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Debug the data mapping process
   */
  static debugDataMapping(rawDataPoint, deviceId) {
    console.log("🔍 [Debug] Raw data point:", JSON.stringify(rawDataPoint, null, 2))
    console.log("🔍 [Debug] Device ID:", deviceId)
    console.log("🔍 [Debug] Device ID type:", typeof deviceId)
    console.log("🔍 [Debug] Is valid ObjectId:", mongoose.Types.ObjectId.isValid(deviceId))

    const mappedData = {
      deviceId: deviceId,
      timestamp: rawDataPoint.timestamp || new Date(),
      ...rawDataPoint.data,
    }

    console.log("🔍 [Debug] Mapped data:", JSON.stringify(mappedData, null, 2))

    // Validate against schema
    const sensorData = new SensorData(mappedData)
    const validationError = sensorData.validateSync()

    if (validationError) {
      console.error("❌ [Debug] Validation error:", validationError.message)
      return { valid: false, error: validationError.message, data: mappedData }
    }

    console.log("✅ [Debug] Data validation passed")
    return { valid: true, data: mappedData }
  }

  /**
   * Enhanced insertion with detailed logging
   */
  static async debugInsertMany(mappedDataArray, deviceSerialNumber) {
    try {
      console.log(`🔍 [Debug] Attempting to insert ${mappedDataArray.length} records for device: ${deviceSerialNumber}`)

      // Log first record for debugging
      if (mappedDataArray.length > 0) {
        console.log("🔍 [Debug] First record sample:", JSON.stringify(mappedDataArray[0], null, 2))
      }

      // Validate all records before insertion
      const validationResults = mappedDataArray.map((data, index) => {
        const sensorData = new SensorData(data)
        const error = sensorData.validateSync()
        return { index, valid: !error, error: error?.message }
      })

      const invalidRecords = validationResults.filter((r) => !r.valid)
      if (invalidRecords.length > 0) {
        console.error("❌ [Debug] Invalid records found:", invalidRecords)
        return { success: false, error: "Validation failed", invalidRecords }
      }

      console.log("✅ [Debug] All records passed validation")

      // Attempt insertion with detailed error handling
      const insertOptions = {
        ordered: false,
        writeConcern: { w: "majority", j: true },
      }

      console.log("🔍 [Debug] Insert options:", insertOptions)

      const result = await SensorData.insertMany(mappedDataArray, insertOptions)

      console.log(`✅ [Debug] Successfully inserted ${result.length} records`)
      console.log(
        "🔍 [Debug] Inserted IDs:",
        result.map((r) => r._id),
      )

      // Verify insertion by counting
      const countAfter = await SensorData.countDocuments()
      console.log(`🔍 [Debug] Total SensorData count after insertion: ${countAfter}`)

      return {
        success: true,
        insertedCount: result.length,
        insertedIds: result.map((r) => r._id),
        totalCount: countAfter,
      }
    } catch (error) {
      console.error("❌ [Debug] Insert operation failed:", error)

      // Handle bulk write errors specifically
      if (error.name === "BulkWriteError") {
        console.error("❌ [Debug] Bulk write error details:", {
          insertedCount: error.result?.insertedCount || 0,
          writeErrors:
            error.writeErrors?.map((e) => ({
              index: e.index,
              code: e.code,
              message: e.errmsg,
            })) || [],
        })
      }

      return {
        success: false,
        error: error.message,
        errorType: error.name,
        details: error.writeErrors || null,
      }
    }
  }

  /**
   * Check for recent insertions
   */
  static async checkRecentInsertions(minutes = 10) {
    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)

      const recentRecords = await SensorData.find({
        createdAt: { $gte: cutoffTime },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()

      console.log(`🔍 [Debug] Found ${recentRecords.length} records in last ${minutes} minutes`)

      if (recentRecords.length > 0) {
        console.log("🔍 [Debug] Most recent record:", JSON.stringify(recentRecords[0], null, 2))
      }

      return recentRecords
    } catch (error) {
      console.error("❌ [Debug] Error checking recent insertions:", error)
      return []
    }
  }
}

module.exports = DebugIngestionService
