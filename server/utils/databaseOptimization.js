const mongoose = require("mongoose")

/**
 * Database optimization utilities for IoT system
 */
class DatabaseOptimizer {
  constructor() {
    this.indexStats = new Map()
    this.queryStats = new Map()
  }

  /**
   * Create all indexes for optimal performance
   */
  async createOptimalIndexes() {
    try {
      console.log("🚀 Creating optimal database indexes...")

      const db = mongoose.connection.db

      // Get all collections
      const collections = await db.listCollections().toArray()

      for (const collection of collections) {
        const collectionName = collection.name
        console.log(`📊 Optimizing indexes for ${collectionName}...`)

        // Get existing indexes
        const existingIndexes = await db.collection(collectionName).indexes()
        console.log(`   Found ${existingIndexes.length} existing indexes`)

        // Store index stats
        this.indexStats.set(collectionName, {
          existing: existingIndexes.length,
          created: 0,
          optimized: new Date(),
        })
      }

      console.log("✅ Database indexes optimized successfully!")
      return this.indexStats
    } catch (error) {
      console.error("❌ Error creating optimal indexes:", error)
      throw error
    }
  }

  /**
   * Analyze query performance
   */
  async analyzeQueryPerformance(model, query, options = {}) {
    try {
      const startTime = Date.now()

      // Execute query with explain
      const explainResult = await model.find(query).explain("executionStats")

      const endTime = Date.now()
      const executionTime = endTime - startTime

      const stats = {
        query,
        executionTime,
        documentsExamined: explainResult.executionStats.totalDocsExamined,
        documentsReturned: explainResult.executionStats.totalDocsReturned,
        indexUsed: explainResult.executionStats.executionStages.stage === "IXSCAN",
        winningPlan: explainResult.queryPlanner.winningPlan,
        timestamp: new Date(),
      }

      // Store query stats
      const modelName = model.modelName
      if (!this.queryStats.has(modelName)) {
        this.queryStats.set(modelName, [])
      }
      this.queryStats.get(modelName).push(stats)

      return stats
    } catch (error) {
      console.error("Error analyzing query performance:", error)
      throw error
    }
  }

  /**
   * Get slow queries report
   */
  getSlowQueriesReport(thresholdMs = 100) {
    const slowQueries = []

    for (const [modelName, queries] of this.queryStats) {
      const slow = queries.filter((q) => q.executionTime > thresholdMs)
      if (slow.length > 0) {
        slowQueries.push({
          model: modelName,
          slowQueries: slow,
          count: slow.length,
        })
      }
    }

    return slowQueries
  }

  /**
   * Optimize collection for time-series data
   */
  async optimizeTimeSeriesCollection(collectionName, timeField = "timestamp") {
    try {
      const db = mongoose.connection.db
      const collection = db.collection(collectionName)

      // Create time-based indexes
      await collection.createIndex({ [timeField]: -1 }, { background: true })

      // Create compound indexes for common queries
      if (collectionName === "sensordatas") {
        await collection.createIndex({ deviceId: 1, [timeField]: -1 }, { background: true })
        await collection.createIndex({ deviceId: 1, sensorType: 1, [timeField]: -1 }, { background: true })
      }

      console.log(`✅ Optimized time-series collection: ${collectionName}`)
    } catch (error) {
      console.error(`❌ Error optimizing collection ${collectionName}:`, error)
      throw error
    }
  }

  /**
   * Clean up old data based on TTL
   */
  async cleanupOldData(collectionName, field, olderThanDays) {
    try {
      const db = mongoose.connection.db
      const collection = db.collection(collectionName)

      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

      const result = await collection.deleteMany({
        [field]: { $lt: cutoffDate },
      })

      console.log(`🧹 Cleaned up ${result.deletedCount} old records from ${collectionName}`)
      return result.deletedCount
    } catch (error) {
      console.error(`❌ Error cleaning up ${collectionName}:`, error)
      throw error
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const db = mongoose.connection.db
      const stats = await db.stats()

      const collections = await db.listCollections().toArray()
      const collectionStats = []

      for (const collection of collections) {
        const collectionName = collection.name
        const collStats = await db.collection(collectionName).stats()

        collectionStats.push({
          name: collectionName,
          count: collStats.count,
          size: collStats.size,
          avgObjSize: collStats.avgObjSize,
          indexCount: collStats.nindexes,
          indexSize: collStats.totalIndexSize,
        })
      }

      return {
        database: {
          collections: stats.collections,
          objects: stats.objects,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize,
          storageSize: stats.storageSize,
        },
        collections: collectionStats,
        timestamp: new Date(),
      }
    } catch (error) {
      console.error("Error getting database stats:", error)
      throw error
    }
  }

  /**
   * Monitor index usage
   */
  async monitorIndexUsage(collectionName) {
    try {
      const db = mongoose.connection.db
      const collection = db.collection(collectionName)

      const indexStats = await collection.aggregate([{ $indexStats: {} }]).toArray()

      return indexStats.map((stat) => ({
        name: stat.name,
        usageCount: stat.accesses.ops,
        lastUsed: stat.accesses.since,
      }))
    } catch (error) {
      console.error(`Error monitoring index usage for ${collectionName}:`, error)
      throw error
    }
  }

  /**
   * Suggest index optimizations
   */
  async suggestOptimizations() {
    try {
      const suggestions = []
      const slowQueries = this.getSlowQueriesReport(50) // 50ms threshold

      for (const modelReport of slowQueries) {
        for (const query of modelReport.slowQueries) {
          if (!query.indexUsed) {
            suggestions.push({
              type: "missing_index",
              model: modelReport.model,
              query: query.query,
              suggestion: `Consider adding an index for fields: ${Object.keys(query.query).join(", ")}`,
              impact: "high",
              executionTime: query.executionTime,
            })
          }

          if (query.documentsExamined > query.documentsReturned * 10) {
            suggestions.push({
              type: "inefficient_query",
              model: modelReport.model,
              query: query.query,
              suggestion: "Query examines too many documents. Consider adding more selective indexes.",
              impact: "medium",
              ratio: query.documentsExamined / query.documentsReturned,
            })
          }
        }
      }

      return suggestions
    } catch (error) {
      console.error("Error generating optimization suggestions:", error)
      throw error
    }
  }
}

// Export singleton instance
module.exports = new DatabaseOptimizer()
