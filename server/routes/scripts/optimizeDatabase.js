const mongoose = require("mongoose")
const DatabaseOptimizer = require("../utils/databaseOptimization")

// Import models to ensure schemas are registered
require("../models/device")
require("../models/user")
require("../models/sensorData")
require("../models/TankType")

/**
 * Database optimization script
 * Run this script to optimize your database performance
 */
async function optimizeDatabase() {
  try {
    console.log("🚀 Starting database optimization...")

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Create optimal indexes
    await DatabaseOptimizer.createOptimalIndexes()

    // Optimize time-series collections
    await DatabaseOptimizer.optimizeTimeSeriesCollection("sensordatas", "timestamp")

    // Get database statistics
    const stats = await DatabaseOptimizer.getDatabaseStats()
    console.log("📊 Database Statistics:")
    console.log(`   Collections: ${stats.database.collections}`)
    console.log(`   Total Objects: ${stats.database.objects}`)
    console.log(`   Data Size: ${(stats.database.dataSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Index Size: ${(stats.database.indexSize / 1024 / 1024).toFixed(2)} MB`)

    // Monitor index usage for each collection
    console.log("\n📈 Index Usage Statistics:")
    for (const collection of stats.collections) {
      const indexUsage = await DatabaseOptimizer.monitorIndexUsage(collection.name)
      console.log(`   ${collection.name}:`)
      indexUsage.forEach((index) => {
        console.log(`     - ${index.name}: ${index.usageCount} operations`)
      })
    }

    // Clean up old sensor data (older than 1 year)
    const cleanedCount = await DatabaseOptimizer.cleanupOldData("sensordatas", "timestamp", 365)
    console.log(`🧹 Cleaned up ${cleanedCount} old sensor data records`)

    // Generate optimization suggestions
    const suggestions = await DatabaseOptimizer.suggestOptimizations()
    if (suggestions.length > 0) {
      console.log("\n💡 Optimization Suggestions:")
      suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion.suggestion}`)
        console.log(`      Impact: ${suggestion.impact}`)
        console.log(`      Model: ${suggestion.model}`)
      })
    } else {
      console.log("\n✅ No optimization suggestions - database is well optimized!")
    }

    console.log("\n🎉 Database optimization completed successfully!")
  } catch (error) {
    console.error("❌ Database optimization failed:", error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log("👋 Disconnected from MongoDB")
    process.exit(0)
  }
}

// Run optimization if script is executed directly
if (require.main === module) {
  optimizeDatabase()
}

module.exports = optimizeDatabase
