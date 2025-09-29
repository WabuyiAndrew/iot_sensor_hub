const { VolumeReading, VolumeAnalytics } = require("../models/VolumeHistory")
const Tank = require("../models/tankType")
const VolumeHistory = require("../models/VolumeHistory")
const { calculateVolume } = require("../../src/utils/tank-volume-calculation") // Re-use frontend logic

class VolumeCalculationService {
  /**
   * Convert sensor reading to liquid level with proper depth usage
   */
  static convertSensorReadingToLevel(sensorReading, tank, sensorConfig = {}) {
    const { dimensions, sensorType, sensorOffset = 0 } = tank

    // Get total tank depth/height
    const tankDepth = dimensions.totalHeight || dimensions.height || dimensions.diameter || 0

    if (tankDepth <= 0) {
      throw new Error("Invalid tank depth for level calculation")
    }

    let liquidLevel = 0

    switch (sensorType) {
      case "ultrasonic":
      case "laser":
        // Top-mounted: reading is air gap from sensor to surface
        liquidLevel = tankDepth - sensorReading - sensorOffset
        break

      case "pressure_submersible":
        // Bottom-mounted: convert pressure to height
        const density = sensorConfig.liquidDensity || 1000 // kg/m³
        const pressureUnit = sensorConfig.pressureUnit || "pa"

        let pressurePa = sensorReading
        switch (pressureUnit.toLowerCase()) {
          case "bar":
            pressurePa *= 100000
            break
          case "psi":
            pressurePa *= 6894.76
            break
          case "kpa":
            pressurePa *= 1000
            break
        }

        liquidLevel = pressurePa / (density * 9.81)
        break

      case "guided_wave_radar":
        const probeLength = sensorConfig.probeLength || tankDepth
        liquidLevel = probeLength - sensorReading
        break

      case "float_level":
        liquidLevel = sensorReading - (sensorConfig.floatOffset || 0)
        break

      case "capacitive":
        if (sensorConfig.outputType === "percentage") {
          liquidLevel = (sensorReading / 100) * tankDepth
        } else {
          liquidLevel = sensorReading
        }
        break

      default:
        liquidLevel = sensorReading
    }

    // Ensure level is within tank bounds
    return Math.max(0, Math.min(liquidLevel, tankDepth))
  }

  /**
   * Calculate volume with proper unit conversion
   */
  static calculateVolumeWithUnits(tank, liquidLevel) {
    const { shape, orientation, dimensions, deadSpace = 0, materialType = "liquid", density } = tank

    // Calculate raw volume in cubic meters
    const volumeM3 = this.calculateRawVolume(shape, orientation, dimensions, liquidLevel, deadSpace)

    // Convert to appropriate units based on material type
    let volumeInUnits = {}
    let estimatedWeight = 0

    if (materialType === "liquid") {
      // Liquids: convert to liters
      volumeInUnits = {
        value: volumeM3 * 1000,
        unit: "liters",
      }

      // Calculate weight if density is provided
      if (density) {
        estimatedWeight = volumeM3 * density // kg
      }
    } else {
      // Solids/granular materials: use density for weight calculation
      if (density) {
        estimatedWeight = volumeM3 * density // kg
        volumeInUnits = {
          value: estimatedWeight / 1000, // tonnes
          unit: "tonnes",
        }
      } else {
        // Fallback to cubic meters
        volumeInUnits = {
          value: volumeM3,
          unit: "cubic_meters",
        }
      }
    }

    const totalVolumeM3 = this.calculateRawVolume(
      shape,
      orientation,
      dimensions,
      dimensions.totalHeight || dimensions.height,
      0,
    )
    const usableVolumeM3 =
      totalVolumeM3 - (deadSpace > 0 ? this.calculateRawVolume(shape, orientation, dimensions, deadSpace, 0) : 0)

    const fillPercentage = usableVolumeM3 > 0 ? (volumeM3 / usableVolumeM3) * 100 : 0

    return {
      currentVolumeM3: volumeM3,
      totalVolumeM3,
      usableVolumeM3,
      fillPercentage: Math.max(0, Math.min(100, fillPercentage)),
      volumeInUnits,
      estimatedWeight,
      liquidLevel,
    }
  }

  /**
   * Calculate raw volume in cubic meters
   */
  static calculateRawVolume(shape, orientation, dimensions, liquidLevel, deadSpace = 0) {
    const effectiveLevel = Math.max(0, liquidLevel - deadSpace)

    switch (shape) {
      case "cylindrical":
        return this.calculateCylindricalVolume(dimensions, orientation, effectiveLevel)
      case "rectangular":
        return this.calculateRectangularVolume(dimensions, effectiveLevel)
      case "spherical":
        return this.calculateSphericalVolume(dimensions, effectiveLevel)
      case "cone_bottom":
        return this.calculateConeBottomVolume(dimensions, effectiveLevel)
      case "silo":
        return this.calculateSiloVolume(dimensions, effectiveLevel)
      default:
        throw new Error(`Unsupported tank shape: ${shape}`)
    }
  }

  static calculateCylindricalVolume(dimensions, orientation, liquidLevel) {
    const radius = dimensions.diameter / 2

    if (orientation === "vertical") {
      return Math.PI * radius * radius * liquidLevel
    } else {
      // Horizontal cylinder - more complex calculation
      const length = dimensions.height // In horizontal, height becomes length
      if (liquidLevel <= 0) return 0
      if (liquidLevel >= dimensions.diameter) return Math.PI * radius * radius * length

      const h = liquidLevel
      const segmentArea =
        radius * radius * Math.acos((radius - h) / radius) - (radius - h) * Math.sqrt(2 * radius * h - h * h)
      return segmentArea * length
    }
  }

  static calculateRectangularVolume(dimensions, liquidLevel) {
    return dimensions.length * dimensions.width * liquidLevel
  }

  static calculateSphericalVolume(dimensions, liquidLevel) {
    const radius = dimensions.diameter / 2
    if (liquidLevel <= 0) return 0
    if (liquidLevel >= dimensions.diameter) return (4 / 3) * Math.PI * Math.pow(radius, 3)

    const h = liquidLevel
    return (Math.PI * h * h * (3 * radius - h)) / 3
  }

  static calculateConeBottomVolume(dimensions, liquidLevel) {
    const radius = dimensions.diameter / 2
    const coneHeight = dimensions.coneHeight
    const cylinderHeight = dimensions.cylinderHeight

    if (liquidLevel <= coneHeight) {
      // Only cone is filled
      const coneRadius = (liquidLevel / coneHeight) * radius
      return (1 / 3) * Math.PI * coneRadius * coneRadius * liquidLevel
    } else {
      // Cone + cylinder
      const coneVolume = (1 / 3) * Math.PI * radius * radius * coneHeight
      const cylinderFill = liquidLevel - coneHeight
      const cylinderVolume = Math.PI * radius * radius * cylinderFill
      return coneVolume + cylinderVolume
    }
  }

  static calculateSiloVolume(dimensions, liquidLevel) {
    const radius = dimensions.diameter / 2
    return Math.PI * radius * radius * liquidLevel
  }

  /**
   * Record volume reading with flow tracking
   */
  static async recordVolumeReading(tankId, sensorData, rawSensorData = {}) {
    try {
      const tank = await Tank.findById(tankId)
      if (!tank) {
        throw new Error("Tank not found")
      }

      // Convert sensor reading to liquid level
      const liquidLevel = this.convertSensorReadingToLevel(sensorData.sensorReading, tank, tank.sensorConfig)

      // Calculate volume with proper units
      const volumeCalc = this.calculateVolumeWithUnits(tank, liquidLevel)

      // Get previous reading for flow calculation
      const previousReading = await VolumeReading.findOne({ tankId }).sort({ timestamp: -1 }).limit(1)

      // Create volume reading record
      const volumeReading = new VolumeReading({
        tankId,
        deviceId: sensorData.deviceId,
        rawSensorReading: sensorData.sensorReading,
        sensorType: tank.sensorType,
        dataQuality: sensorData.dataQuality || "good",

        liquidLevel,
        currentVolume: volumeCalc.currentVolumeM3 * 1000, // Store in liters for consistency
        totalVolume: volumeCalc.totalVolumeM3 * 1000,
        usableVolume: volumeCalc.usableVolumeM3 * 1000,
        fillPercentage: volumeCalc.fillPercentage,
        deadSpaceVolume: (tank.deadSpace || 0) * Math.PI * Math.pow(tank.dimensions.diameter / 2, 2) * 1000,

        materialType: tank.materialType || "liquid",
        density: tank.density,
        estimatedWeight: volumeCalc.estimatedWeight,
        volumeInUnits: volumeCalc.volumeInUnits,

        temperature: rawSensorData.temperature,
        pressure: rawSensorData.pressure,
        humidity: rawSensorData.humidity,

        calculationParams: {
          tankHeight: tank.dimensions.totalHeight || tank.dimensions.height,
          sensorOffset: tank.sensorOffset,
          deadSpace: tank.deadSpace,
          sensorConfig: tank.sensorConfig,
        },

        rawSensorData,
      })

      await volumeReading.save()

      // Update analytics asynchronously
      this.updateVolumeAnalytics(tankId, volumeReading, previousReading)

      return volumeReading
    } catch (error) {
      console.error("Error recording volume reading:", error)
      throw error
    }
  }

  /**
   * Update volume analytics with flow tracking
   */
  static async updateVolumeAnalytics(tankId, currentReading, previousReading) {
    try {
      const now = new Date()
      const periods = [
        { type: "hourly", start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()) },
        { type: "daily", start: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        { type: "weekly", start: this.getWeekStart(now) },
        { type: "monthly", start: new Date(now.getFullYear(), now.getMonth(), 1) },
      ]

      for (const period of periods) {
        await this.updatePeriodAnalytics(tankId, period, currentReading, previousReading)
      }
    } catch (error) {
      console.error("Error updating volume analytics:", error)
    }
  }

  static async updatePeriodAnalytics(tankId, period, currentReading, previousReading) {
    const periodEnd = this.getPeriodEnd(period.start, period.type)

    let analytics = await VolumeAnalytics.findOne({
      tankId,
      periodType: period.type,
      periodStart: period.start,
    })

    if (!analytics) {
      analytics = new VolumeAnalytics({
        tankId,
        periodType: period.type,
        periodStart: period.start,
        periodEnd,
        volumeStats: {
          opening: {
            volume: currentReading.currentVolume,
            timestamp: currentReading.timestamp,
          },
          closing: {
            volume: currentReading.currentVolume,
            timestamp: currentReading.timestamp,
          },
          minimum: {
            volume: currentReading.currentVolume,
            timestamp: currentReading.timestamp,
          },
          maximum: {
            volume: currentReading.currentVolume,
            timestamp: currentReading.timestamp,
          },
          average: currentReading.currentVolume,
          totalAdded: 0,
          totalUsed: 0,
          netChange: 0,
          avgFillPercentage: currentReading.fillPercentage,
          minFillPercentage: currentReading.fillPercentage,
          maxFillPercentage: currentReading.fillPercentage,
          readingCount: 1,
          qualityScore: this.getQualityScore(currentReading.dataQuality),
          alertsTriggered: [],
        },
        materialAnalytics: {
          materialType: currentReading.materialType,
          density: currentReading.density,
          weightStats: {
            opening: currentReading.estimatedWeight || 0,
            closing: currentReading.estimatedWeight || 0,
            minimum: currentReading.estimatedWeight || 0,
            maximum: currentReading.estimatedWeight || 0,
            average: currentReading.estimatedWeight || 0,
            totalAdded: 0,
            totalUsed: 0,
          },
        },
      })
    } else {
      // Update existing analytics
      const stats = analytics.volumeStats
      const materialStats = analytics.materialAnalytics.weightStats

      // Update closing values
      stats.closing = {
        volume: currentReading.currentVolume,
        timestamp: currentReading.timestamp,
      }

      // Update min/max
      if (currentReading.currentVolume < stats.minimum.volume) {
        stats.minimum = {
          volume: currentReading.currentVolume,
          timestamp: currentReading.timestamp,
        }
      }
      if (currentReading.currentVolume > stats.maximum.volume) {
        stats.maximum = {
          volume: currentReading.currentVolume,
          timestamp: currentReading.timestamp,
        }
      }

      // Calculate flow (added/used) if we have previous reading
      if (previousReading && previousReading.timestamp >= period.start) {
        const volumeChange = currentReading.currentVolume - previousReading.currentVolume
        if (volumeChange > 0) {
          stats.totalAdded += volumeChange
        } else {
          stats.totalUsed += Math.abs(volumeChange)
        }
        stats.netChange = stats.totalAdded - stats.totalUsed

        // Update weight stats
        if (currentReading.estimatedWeight && previousReading.estimatedWeight) {
          const weightChange = currentReading.estimatedWeight - previousReading.estimatedWeight
          if (weightChange > 0) {
            materialStats.totalAdded += weightChange
          } else {
            materialStats.totalUsed += Math.abs(weightChange)
          }
        }
      }

      // Update averages
      stats.readingCount++
      stats.average = (stats.average * (stats.readingCount - 1) + currentReading.currentVolume) / stats.readingCount
      stats.avgFillPercentage =
        (stats.avgFillPercentage * (stats.readingCount - 1) + currentReading.fillPercentage) / stats.readingCount

      // Update fill percentage min/max
      stats.minFillPercentage = Math.min(stats.minFillPercentage, currentReading.fillPercentage)
      stats.maxFillPercentage = Math.max(stats.maxFillPercentage, currentReading.fillPercentage)

      // Update weight stats
      if (currentReading.estimatedWeight) {
        materialStats.closing = currentReading.estimatedWeight
        materialStats.minimum = Math.min(materialStats.minimum, currentReading.estimatedWeight)
        materialStats.maximum = Math.max(materialStats.maximum, currentReading.estimatedWeight)
        materialStats.average =
          (materialStats.average * (stats.readingCount - 1) + currentReading.estimatedWeight) / stats.readingCount
      }
    }

    await analytics.save()
  }

  static getQualityScore(quality) {
    const scores = { excellent: 100, good: 80, fair: 60, poor: 40, error: 0 }
    return scores[quality] || 50
  }

  static getWeekStart(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  static getPeriodEnd(start, type) {
    const end = new Date(start)
    switch (type) {
      case "hourly":
        end.setHours(end.getHours() + 1)
        break
      case "daily":
        end.setDate(end.getDate() + 1)
        break
      case "weekly":
        end.setDate(end.getDate() + 7)
        break
      case "monthly":
        end.setMonth(end.getMonth() + 1)
        break
    }
    return end
  }

  /**
   * Get volume history with flow analysis
   */
  static async getVolumeHistory(tankId, options = {}) {
    const { days = 7, aggregation = "hourly", includeFlow = true, includeAlerts = false } = options

    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

    if (aggregation === "raw") {
      // Return raw readings
      return await VolumeReading.find({
        tankId,
        timestamp: { $gte: startDate, $lte: endDate },
      }).sort({ timestamp: 1 })
    } else {
      // Return aggregated analytics
      const analytics = await VolumeAnalytics.find({
        tankId,
        periodType: aggregation,
        periodStart: { $gte: startDate, $lte: endDate },
      }).sort({ periodStart: 1 })

      return analytics.map((a) => ({
        _id: a.periodStart.toISOString(),
        period: this.formatPeriod(a.periodStart, aggregation),
        volumeStats: a.volumeStats,
        materialAnalytics: includeFlow ? a.materialAnalytics : undefined,
        operationalMetrics: a.operationalMetrics,
        alerts: includeAlerts ? a.volumeStats.alertsTriggered : undefined,
      }))
    }
  }

  static formatPeriod(date, type) {
    const options = {
      hourly: { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
      daily: { month: "short", day: "numeric" },
      weekly: { month: "short", day: "numeric" },
      monthly: { year: "numeric", month: "long" },
    }

    return date.toLocaleDateString("en-US", options[type])
  }

  /**
   * Calculates the current volume and fill percentage of a tank based on its latest sensor reading.
   * This service can be called when a new sensor reading comes in or on demand.
   * @param {string} tankId - The ID of the tank.
   * @returns {Promise<object>} An object containing updated volume, level, and fill percentage.
   */
  static async updateTankVolumeFromLatestReading(tankId) {
    const tank = await Tank.findById(tankId).populate("assignedDevice")
    if (!tank) {
      throw new Error(`Tank with ID ${tankId} not found.`)
    }
    if (!tank.assignedDevice) {
      throw new Error(`Tank ${tank.name} has no assigned device.`)
    }

    // Get the latest sensor data for the assigned device
    const latestReading = await require("../models/SensorData")
      .findOne({
        deviceId: tank.assignedDevice.serialNumber,
        sensorType: { $in: ["liquid_level", "multi_sensor"] },
      })
      .sort({ timestamp: -1 })
      .lean()

    if (!latestReading || typeof latestReading.ultrasonic_liquid_level !== "number") {
      console.warn(
        `No valid liquid level reading found for device ${tank.assignedDevice.serialNumber} assigned to tank ${tank.name}.`,
      )
      return {
        currentVolume: tank.currentVolume,
        currentLevel: tank.currentLevel,
        fillPercentage: tank.fillPercentage,
      }
    }

    const totalTankHeight = tank.dimensions.height || 2.0 // Default to 2m if not set
    const deadSpaceBottom = tank.dimensions.deadSpaceBottom || 0
    const deadSpaceTop = tank.dimensions.deadSpaceTop || 0

    // Calculate actual liquid depth from the bottom
    const currentLiquidLevel = Math.max(0, totalTankHeight - latestReading.ultrasonic_liquid_level - deadSpaceBottom)

    // Calculate volume using the shared utility function
    const calculatedVolume = calculateVolume(tank.tankType, tank.dimensions, currentLiquidLevel, tank.capacity.unit)

    if (typeof calculatedVolume !== "number") {
      throw new Error(`Failed to calculate volume for tank ${tank.name}.`)
    }

    tank.currentLevel = currentLiquidLevel
    tank.currentVolume = calculatedVolume
    tank.fillPercentage = (calculatedVolume / tank.capacity.value) * 100
    tank.lastUpdated = new Date()

    await tank.save()

    // Record raw volume history
    await VolumeHistory.create({
      tankId: tank._id,
      timestamp: new Date(),
      volumeRemaining: tank.currentVolume,
      level: tank.currentLevel,
      fillPercentage: tank.fillPercentage,
      capacity: tank.capacity,
      period: "raw",
    })

    return {
      currentVolume: tank.currentVolume,
      currentLevel: tank.currentLevel,
      fillPercentage: tank.fillPercentage,
    }
  }

  /**
   * Retrieves aggregated volume history for a tank over a specified period.
   * @param {string} tankId - The ID of the tank.
   * @param {string} period - "daily", "weekly", "monthly", "yearly"
   * @param {Date} startDate - Start date for the query.
   * @param {Date} endDate - End date for the query.
   * @returns {Promise<Array>} Array of aggregated volume history data.
   */
  static async getAggregatedVolumeHistory(tankId, period, startDate, endDate) {
    const query = {
      tankId: tankId,
      period: period,
      timestamp: { $gte: startDate, $lte: endDate },
    }

    const history = await VolumeHistory.find(query).sort({ timestamp: 1 }).lean()
    return history
  }

  /**
   * Calculates volume used and added over a specific time range from raw data.
   * @param {string} tankId - The ID of the tank.
   * @param {Date} startDate - The start date of the range.
   * @param {Date} endDate - The end date of the range.
   * @returns {Promise<{volumeUsed: number, volumeAdded: number}>}
   */
  static async calculateUsageAndAdditions(tankId, startDate, endDate) {
    const rawReadings = await VolumeHistory.find({
      tankId: tankId,
      period: "raw",
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .sort({ timestamp: 1 })
      .lean()

    if (rawReadings.length < 2) {
      return { volumeUsed: 0, volumeAdded: 0 }
    }

    let totalVolumeUsed = 0
    let totalVolumeAdded = 0

    for (let i = 1; i < rawReadings.length; i++) {
      const prevVolume = rawReadings[i - 1].volumeRemaining
      const currentVolume = rawReadings[i].volumeRemaining

      if (currentVolume < prevVolume) {
        totalVolumeUsed += prevVolume - currentVolume
      } else if (currentVolume > prevVolume) {
        totalVolumeAdded += currentVolume - prevVolume
      }
    }

    return { volumeUsed: totalVolumeUsed, volumeAdded: totalVolumeAdded }
  }
}

module.exports = VolumeCalculationService
