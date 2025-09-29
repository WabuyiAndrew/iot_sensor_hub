
/**
 * ✅ ENHANCED Tank Volume Calculations - Fixed volume computation issues
 * Key fixes: radius calculation, unit conversion, capacity validation, better error handling
 */

const PI = Math.PI

/**
 * ✅ ENHANCED: Converts a raw sensor reading into a liquid level (in meters) within the tank.
 */
function convertSensorReadingToLevel(
  rawSensorReading,
  sensorType,
  sensorConfig = {},
  totalTankHeight,
  tankOffsetDepth = 0,
  deviceCalibrationOffset = 0,
) {
  console.log(`[ENHANCED Volume Calc] Converting sensor reading: ${rawSensorReading}m, type: ${sensorType}`)

  // Enhanced input validation
  if (rawSensorReading === null || rawSensorReading === undefined || isNaN(rawSensorReading)) {
    console.warn(`[ENHANCED Volume Calc] Invalid raw sensor reading: ${rawSensorReading}. Returning 0.`)
    return 0
  }

  if (!totalTankHeight || totalTankHeight <= 0 || isNaN(totalTankHeight)) {
    console.warn(`[ENHANCED Volume Calc] Invalid tank height: ${totalTankHeight}. Returning 0.`)
    return 0
  }

  // ✅ ENHANCED: Ensure all values are numbers and properly converted
  const compensatedReading = Number(rawSensorReading) + Number(deviceCalibrationOffset || 0)
  const effectiveTankOffsetDepth = Number(tankOffsetDepth || 0)

  console.log(
    `[ENHANCED Volume Calc] Compensated reading: ${compensatedReading}m, offset depth: ${effectiveTankOffsetDepth}m, tank height: ${totalTankHeight}m`,
  )

  let liquidLevel = 0

  try {
    switch (sensorType.toLowerCase()) {
      case "ultrasonic":
      case "ultrasonic_level_sensor":
      case "radar":
      case "radar_level_sensor":
      case "laser":
      case "laser_level_sensor":
        // Distance-based sensors (measure ullage - distance from sensor to liquid surface)
        const maxRange = Number(sensorConfig.maxSensorRange || totalTankHeight * 1.5)
        const minRange = Number(sensorConfig.minSensorRange || 0.05)

        // Clamp reading within sensor's operational range
        let effectiveReading = Math.min(compensatedReading, maxRange)
        effectiveReading = Math.max(effectiveReading, minRange)

        // ✅ ENHANCED: Calculate liquid level: tank height - distance from sensor - offset
        liquidLevel = totalTankHeight - effectiveReading - effectiveTankOffsetDepth
        console.log(
          `[ENHANCED Volume Calc] Distance sensor calc: ${totalTankHeight} - ${effectiveReading} - ${effectiveTankOffsetDepth} = ${liquidLevel}m`,
        )
        break

      case "pressure":
      case "pressure_transmitter":
      case "submersible":
      case "submersible_level_sensor":
        // Pressure-based sensors (measure hydrostatic pressure proportional to liquid height)
        const pressureToHeightFactor = Number(sensorConfig.pressureToHeightFactor || 1)
        const heightAtSensor = compensatedReading * pressureToHeightFactor

        // For pressure sensors, offset typically represents sensor height from tank bottom
        liquidLevel = heightAtSensor + effectiveTankOffsetDepth
        console.log(
          `[ENHANCED Volume Calc] Pressure sensor calc: ${compensatedReading} × ${pressureToHeightFactor} + ${effectiveTankOffsetDepth} = ${liquidLevel}m`,
        )
        break

      case "float":
      case "float_switch":
      case "capacitive":
      case "capacitive_level_sensor":
      case "vibrating_fork":
        // Direct level sensors
        liquidLevel = compensatedReading + effectiveTankOffsetDepth
        console.log(
          `[ENHANCED Volume Calc] Direct sensor calc: ${compensatedReading} + ${effectiveTankOffsetDepth} = ${liquidLevel}m`,
        )
        break

      case "weight":
      case "load_cell":
        // Weight-based sensors - assume reading is already converted to level
        console.warn(`[ENHANCED Volume Calc] Load cell conversion simplified. Ensure reading is already a level.`)
        liquidLevel = compensatedReading + effectiveTankOffsetDepth
        break

      default:
        console.warn(`[ENHANCED Volume Calc] Unknown sensor type: ${sensorType}. Using direct reading.`)
        liquidLevel = compensatedReading + effectiveTankOffsetDepth
    }

    // ✅ ENHANCED: Final validation and clamping with detailed logging
    if (liquidLevel < 0) {
      console.warn(`[ENHANCED Volume Calc] Calculated level ${liquidLevel}m is negative, clamping to 0`)
      liquidLevel = 0
    }

    if (liquidLevel > totalTankHeight) {
      console.warn(
        `[ENHANCED Volume Calc] Calculated level ${liquidLevel}m exceeds tank height ${totalTankHeight}m, clamping to tank height`,
      )
      liquidLevel = totalTankHeight
    }

    console.log(
      `[ENHANCED Volume Calc] Final liquid level: ${liquidLevel}m (${((liquidLevel / totalTankHeight) * 100).toFixed(1)}% of tank height)`,
    )
    return liquidLevel
  } catch (error) {
    console.error(`[ENHANCED Volume Calc] Error in sensor conversion:`, error)
    return 0
  }
}

/**
 * ✅ ENHANCED: Calculates the volume of liquid in a tank based on its shape, orientation, dimensions, and liquid level.
 */
function calculateTankVolume(shape, orientation, dimensions, liquidLevel, deadSpaceVolume = 0) {
  console.log(`[ENHANCED Volume Calc] Calculating volume for ${shape} tank, level: ${liquidLevel}m`)
  console.log(`[ENHANCED Volume Calc] Dimensions:`, JSON.stringify(dimensions))

  if (!dimensions || liquidLevel < 0) {
    console.warn(`[ENHANCED Volume Calc] Invalid inputs: dimensions=${!!dimensions}, level=${liquidLevel}`)
    return { currentVolume: 0, calculationMethod: "invalid_input" }
  }

  let volumeM3 = 0
  let calculationMethod = `${shape}_${orientation || "vertical"}`

  try {
    switch (shape.toLowerCase()) {
      case "cylindrical":
        volumeM3 = calculateCylindricalVolume(dimensions, liquidLevel, orientation)
        break
      case "rectangular":
        volumeM3 = calculateRectangularVolume(dimensions, liquidLevel)
        break
      case "spherical":
        volumeM3 = calculateSphericalVolume(dimensions, liquidLevel)
        break
      case "conical":
        volumeM3 = calculateConicalVolume(dimensions, liquidLevel)
        break
      case "silo":
        volumeM3 = calculateSiloVolume(dimensions, liquidLevel)
        break
      case "horizontal_oval":
      case "vertical_oval":
        volumeM3 = calculateOvalVolume(dimensions, liquidLevel, orientation)
        break
      case "horizontal_capsule":
      case "vertical_capsule":
        volumeM3 = calculateCapsuleVolume(dimensions, liquidLevel, orientation)
        break
      case "horizontal_elliptical":
        volumeM3 = calculateEllipticalVolume(dimensions, liquidLevel, orientation)
        break
      case "dish_ends":
        volumeM3 = calculateDishEndVolume(dimensions, liquidLevel)
        break
      default:
        console.warn(`[ENHANCED Volume Calc] Unknown tank shape: ${shape}, using linear approximation`)
        const height = dimensions.height || dimensions.totalHeight || 1
        volumeM3 = ((liquidLevel / height) * (dimensions.capacity || 1000)) / 1000
        calculationMethod = "linear_approximation"
    }

    // Subtract dead space volume
    volumeM3 = Math.max(0, volumeM3 - (deadSpaceVolume || 0))

    console.log(
      `[ENHANCED Volume Calc] Calculated volume: ${volumeM3}m³ (${(volumeM3 * 1000).toFixed(2)}L) using ${calculationMethod}`,
    )

    return {
      currentVolume: volumeM3,
      calculationMethod: calculationMethod,
    }
  } catch (error) {
    console.error(`[ENHANCED Volume Calc] Error calculating volume:`, error)
    return { currentVolume: 0, calculationMethod: "error" }
  }
}

// ✅ CRITICAL ENHANCED FIX: Corrected cylindrical volume calculation
function calculateCylindricalVolume(dimensions, liquidLevel, orientation = "vertical") {
  console.log(`[ENHANCED Cylindrical] Input dimensions:`, JSON.stringify(dimensions))
  console.log(`[ENHANCED Cylindrical] Liquid level: ${liquidLevel}m, Orientation: ${orientation}`)

  // ✅ CRITICAL FIX: Proper radius calculation - this was the main bug!
  let radius
  if (dimensions.diameter && !isNaN(dimensions.diameter) && dimensions.diameter > 0) {
    radius = Number(dimensions.diameter) / 2 // ✅ CORRECT: diameter / 2
    console.log(`[ENHANCED Cylindrical] Using diameter ${dimensions.diameter}m -> radius ${radius}m`)
  } else if (dimensions.radius && !isNaN(dimensions.radius) && dimensions.radius > 0) {
    radius = Number(dimensions.radius) // ✅ CORRECT: use radius directly (was previously dimensions.radius * 2 - WRONG!)
    console.log(`[ENHANCED Cylindrical] Using radius ${radius}m directly`)
  } else {
    throw new Error(`Cylindrical tank requires either diameter or radius. Got: ${JSON.stringify(dimensions)}`)
  }

  const height = dimensions.height || dimensions.totalHeight

  if (!radius || !height || radius <= 0 || height <= 0) {
    throw new Error(`Invalid cylindrical dimensions: radius=${radius}m, height=${height}m`)
  }

  console.log(`[ENHANCED Cylindrical] Final dimensions - Radius: ${radius}m, Height: ${height}m`)

  if (orientation === "horizontal") {
    // Horizontal cylinder - segment calculation
    const length = dimensions.length || height
    const diameter = radius * 2

    console.log(`[ENHANCED Cylindrical] Horizontal tank - Length: ${length}m, Diameter: ${diameter}m`)

    if (liquidLevel <= 0) return 0
    if (liquidLevel >= diameter) {
      const fullVolume = PI * radius * radius * length
      console.log(`[ENHANCED Cylindrical] Tank full - Volume: ${fullVolume}m³`)
      return fullVolume
    }

    // Circular segment area calculation
    const h = liquidLevel
    const r = radius

    // ✅ ENHANCED: Ensure we don't get domain errors in acos
    const cosArg = Math.max(-1, Math.min(1, (r - h) / r))
    const theta = 2 * Math.acos(cosArg)
    const segmentArea = ((r * r) / 2) * (theta - Math.sin(theta))
    const volume = segmentArea * length

    console.log(
      `[ENHANCED Cylindrical] Horizontal segment - h: ${h}m, theta: ${theta.toFixed(3)}, area: ${segmentArea.toFixed(4)}m², volume: ${volume.toFixed(4)}m³`,
    )
    return volume
  } else {
    // Vertical cylinder
    const volume = PI * radius * radius * liquidLevel
    console.log(`[ENHANCED Cylindrical] Vertical - π × ${radius}² × ${liquidLevel} = ${volume.toFixed(4)}m³`)
    return volume
  }
}

function calculateRectangularVolume(dimensions, liquidLevel) {
  const { length, width, height } = dimensions

  if (!length || !width || !height || length <= 0 || width <= 0 || height <= 0) {
    throw new Error(`Invalid rectangular dimensions: L=${length}, W=${width}, H=${height}`)
  }

  const volume = length * width * liquidLevel
  console.log(`[ENHANCED Rectangular] ${length} × ${width} × ${liquidLevel} = ${volume}m³`)
  return volume
}

function calculateSphericalVolume(dimensions, liquidLevel) {
  const radius = dimensions.radius || dimensions.diameter / 2

  if (!radius || radius <= 0) {
    throw new Error(`Invalid spherical dimensions: radius=${radius}`)
  }

  // Spherical cap volume: V = (π/3) * h² * (3r - h)
  const h = Math.min(liquidLevel, 2 * radius)
  const volume = (PI / 3) * h * h * (3 * radius - h)
  console.log(`[ENHANCED Spherical] Cap height: ${h}m, radius: ${radius}m, volume: ${volume}m³`)
  return volume
}

function calculateConicalVolume(dimensions, liquidLevel) {
  // ✅ ENHANCED: Proper radius calculation for conical tanks too
  let radius
  if (dimensions.diameter && !isNaN(dimensions.diameter) && dimensions.diameter > 0) {
    radius = Number(dimensions.diameter) / 2
  } else if (dimensions.radius && !isNaN(dimensions.radius) && dimensions.radius > 0) {
    radius = Number(dimensions.radius)
  } else {
    throw new Error(`Conical tank requires either diameter or radius`)
  }

  const height = dimensions.height

  if (!radius || !height || radius <= 0 || height <= 0) {
    throw new Error(`Invalid conical dimensions: radius=${radius}, height=${height}`)
  }

  // Truncated cone volume
  const r_liquid = (liquidLevel / height) * radius
  const volume = (PI / 3) * r_liquid * r_liquid * liquidLevel
  console.log(`[ENHANCED Conical] Liquid radius: ${r_liquid}m, volume: ${volume}m³`)
  return volume
}

function calculateSiloVolume(dimensions, liquidLevel) {
  const cylinderRadius = dimensions.diameter / 2
  const totalHeight = dimensions.totalHeight
  const coneAngle = dimensions.coneAngle || 0
  const outletRadius = (dimensions.outletDiameter || 0) / 2

  if (!cylinderRadius || !totalHeight || cylinderRadius <= 0 || totalHeight <= 0) {
    throw new Error(`Invalid silo dimensions`)
  }

  // Calculate cone height
  let coneHeight = 0
  if (coneAngle > 0 && cylinderRadius > outletRadius) {
    coneHeight = (cylinderRadius - outletRadius) / Math.tan((coneAngle * PI) / 180)
  }

  const cylinderHeight = totalHeight - coneHeight

  if (liquidLevel <= coneHeight) {
    // Liquid in cone part - frustum volume
    const r1 = outletRadius
    const r2 = outletRadius + (liquidLevel / coneHeight) * (cylinderRadius - outletRadius)
    return (PI / 3) * liquidLevel * (r1 * r1 + r1 * r2 + r2 * r2)
  } else {
    // Liquid in cylinder part
    const coneVolume =
      (PI / 3) *
      coneHeight *
      (outletRadius * outletRadius + outletRadius * cylinderRadius + cylinderRadius * cylinderRadius)
    const cylinderVolume = PI * cylinderRadius * cylinderRadius * (liquidLevel - coneHeight)
    return coneVolume + cylinderVolume
  }
}

function calculateOvalVolume(dimensions, liquidLevel, orientation) {
  // Simplified oval as ellipse
  const a = (dimensions.majorAxis || dimensions.width) / 2
  const b = (dimensions.minorAxis || dimensions.height) / 2
  const length = dimensions.length || dimensions.depth || 1

  if (!a || !b || a <= 0 || b <= 0) {
    throw new Error(`Invalid oval dimensions: a=${a}, b=${b}`)
  }

  if (orientation === "horizontal") {
    // Horizontal elliptical segment
    const h = Math.min(liquidLevel, b * 2)
    const y = b - h
    const cosArg = Math.max(-1, Math.min(1, y / b))
    const area = a * b * Math.acos(cosArg) - y * Math.sqrt(Math.max(0, b * b - y * y))
    return area * length
  } else {
    // Vertical ellipse
    return PI * a * b * liquidLevel
  }
}

function calculateCapsuleVolume(dimensions, liquidLevel, orientation) {
  const radius = dimensions.diameter / 2
  const cylinderLength = dimensions.capsuleLength

  if (!radius || !cylinderLength || radius <= 0 || cylinderLength < 0) {
    throw new Error(`Invalid capsule dimensions: radius=${radius}, length=${cylinderLength}`)
  }

  if (orientation === "horizontal") {
    // Horizontal capsule
    const segmentArea = calculateCircularSegmentArea(radius, liquidLevel)
    const hemisphereVolume = 2 * calculateSphericalCapVolume(radius, liquidLevel)
    return segmentArea * cylinderLength + hemisphereVolume
  } else {
    // Vertical capsule
    const hemisphereHeight = radius
    if (liquidLevel <= hemisphereHeight) {
      // Bottom hemisphere
      return calculateSphericalCapVolume(radius, liquidLevel)
    } else if (liquidLevel <= hemisphereHeight + cylinderLength) {
      // Cylinder part
      const bottomHemisphere = (2 / 3) * PI * radius * radius * radius
      const cylinderVolume = PI * radius * radius * (liquidLevel - hemisphereHeight)
      return bottomHemisphere + cylinderVolume
    } else {
      // Top hemisphere
      const bottomHemisphere = (2 / 3) * PI * radius * radius * radius
      const cylinderVolume = PI * radius * radius * cylinderLength
      const topCapHeight = liquidLevel - hemisphereHeight - cylinderLength
      const topCap = calculateSphericalCapVolume(radius, topCapHeight)
      return bottomHemisphere + cylinderVolume + topCap
    }
  }
}

function calculateEllipticalVolume(dimensions, liquidLevel, orientation) {
  const a = dimensions.majorAxis / 2
  const b = dimensions.minorAxis / 2
  const length = dimensions.length

  if (!a || !b || !length || a <= 0 || b <= 0 || length <= 0) {
    throw new Error(`Invalid elliptical dimensions: a=${a}, b=${b}, length=${length}`)
  }

  // Elliptical segment area
  const h = Math.min(liquidLevel, b * 2)
  const y = b - h
  const cosArg = Math.max(-1, Math.min(1, y / b))
  const area = a * b * Math.acos(cosArg) - y * Math.sqrt(Math.max(0, b * b - y * y))

  return area * length
}

function calculateDishEndVolume(dimensions, liquidLevel) {
  const radius = dimensions.diameter / 2
  const length = dimensions.length
  const dishRadius = dimensions.dishRadius || radius

  if (!radius || !length || radius <= 0 || length <= 0) {
    throw new Error(`Invalid dish end dimensions: radius=${radius}, length=${length}`)
  }

  // Simplified as cylinder + spherical caps
  const cylinderVolume = calculateCircularSegmentArea(radius, liquidLevel) * length
  const dishVolume = 2 * calculateSphericalCapVolume(dishRadius, liquidLevel)

  return cylinderVolume + dishVolume
}

// Helper functions
function calculateCircularSegmentArea(radius, height) {
  if (height <= 0) return 0
  if (height >= 2 * radius) return PI * radius * radius

  const h = height
  const r = radius
  const cosArg = Math.max(-1, Math.min(1, (r - h) / r))
  const theta = 2 * Math.acos(cosArg)
  return ((r * r) / 2) * (theta - Math.sin(theta))
}

function calculateSphericalCapVolume(radius, height) {
  if (height <= 0) return 0
  if (height >= 2 * radius) return (4 / 3) * PI * radius * radius * radius

  const h = height
  const r = radius
  return (PI / 3) * h * h * (3 * r - h)
}

module.exports = {
  convertSensorReadingToLevel,
  calculateTankVolume,
  calculateCylindricalVolume,
  calculateRectangularVolume,
  calculateSphericalVolume,
  calculateConicalVolume,
  calculateSiloVolume,
  calculateOvalVolume,
  calculateCapsuleVolume,
  calculateEllipticalVolume,
  calculateDishEndVolume,
}
