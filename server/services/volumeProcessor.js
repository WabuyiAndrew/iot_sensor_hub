
/**
 * ✅ CORRECTED (Version 2): Complete Tank Volume Processor
 * This version of the module fixes a critical bug where the total height for
 * a spherical tank was being incorrectly used for volume calculation.
 */

const PI = Math.PI;

// --- Main Processing Function ---

/**
 * Main function to process a single tank volume reading.
 *
 * @param {object} tank - The tank object from the database (TankType model).
 * @param {number} rawReading - The raw sensor reading.
 * @param {object} sensorData - The raw sensor data document.
 * @param {object} device - The device associated with the sensor.
 * @returns {Promise<object>} The calculated volume and percentage data.
 */
async function processTankVolumeReading(tank, rawReading, sensorData, device) {
  if (!tank || !device) {
    const errorMessage = `[CORRECTED Volume Processor] Error: Missing tank or device object. Tank: ${!!tank}, Device: ${!!device}`;
    console.error(errorMessage);
    return {
      success: false,
      message: errorMessage,
    };
  }

  console.log(`[CORRECTED Volume Processor] Processing reading for tank: ${tank.name}`);

  try {
    // 1. Get Calculation Parameters
    const { shape, orientation, dimensions, offsetDepth, deviceType, capacity } = tank;
    const { deviceCalibrationOffset } = device;

    // ✅ FIX: Determine the correct total tank height based on its shape.
    const effectiveTotalHeight = determineTankHeight(shape, dimensions);
    console.log(`[CORRECTED Volume Processor] Effective total height for a ${shape} tank is: ${effectiveTotalHeight}m`);

    // 2. Convert Raw Sensor Reading to Liquid Level
    // ✅ FIX: Pass the newly calculated `effectiveTotalHeight` instead of the potentially incorrect `dimensions.totalHeight`.
    const liquidLevel = convertSensorReadingToLevel(
      rawReading,
      deviceType,
      {},
      effectiveTotalHeight, // ✅ CORRECTED PARAMETER
      offsetDepth,
      deviceCalibrationOffset,
    );
    console.log(`[CORRECTED Volume Processor] Converted liquid level: ${liquidLevel}m`);

    // 3. Calculate the Tank's Current Volume in m³
    const { currentVolume: calculatedVolumeM3 } = calculateTankVolume(
      shape,
      orientation,
      dimensions,
      liquidLevel
    );

    const volumeLiters = Math.round(calculatedVolumeM3 * 1000);
    console.log(`[CORRECTED Volume Processor] Calculated volume: ${volumeLiters}L`);

    // 4. Calculate the Fill Percentage
    const fillPercentage = calculateFillPercentage(volumeLiters, tank.capacity);
    console.log(`[CORRECTED Volume Processor] Fill percentage: ${fillPercentage.toFixed(2)}%`);

    // 5. Return the Results
    return {
      success: true,
      volumeLiters,
      fillPercentage,
      effectiveLiquidHeight: liquidLevel,
      calculatedVolumeM3,
      dataQuality: 'good',
    };

  } catch (error) {
    console.error(`[CORRECTED Volume Processor] Error in processTankVolumeReading:`, error);
    return {
      success: false,
      message: error.message || 'An unknown error occurred during volume calculation',
    };
  }
}

// ✅ NEW: Helper function to determine the correct total height for a given tank shape
function determineTankHeight(shape, dimensions) {
  const effectiveShape = shape ? shape.toLowerCase() : "unknown";
  switch (effectiveShape) {
    case 'spherical':
    case 'horizontal_capsule':
    case 'vertical_capsule':
      // The total height of a spherical or capsule tank is its diameter.
      return dimensions.radius ? dimensions.radius * 2 : dimensions.diameter;
    case 'horizontal_elliptical':
    case 'vertical_elliptical':
    case 'horizontal_oval':
    case 'vertical_oval':
      // The total height for these tanks is the minor axis or height.
      return dimensions.minorAxis || dimensions.height;
    case 'cylindrical':
    case 'rectangular':
    case 'conical':
    case 'silo':
    default:
      // For most tanks, we can rely on the provided totalHeight or height.
      return dimensions.totalHeight || dimensions.height;
  }
}

// --- Volume Calculation Functions ---
// (The rest of the code remains the same as the previous version)

/**
 * Converts a raw sensor reading into a liquid level (in meters) within the tank.
 */
function convertSensorReadingToLevel(
  rawSensorReading,
  sensorType,
  sensorConfig = {},
  totalTankHeight, // This is now the CORRECTED total height
  tankOffsetDepth = 0,
  deviceCalibrationOffset = 0,
) {
  const effectiveSensorType = sensorType ? sensorType.toLowerCase() : "unknown";
  console.log(`[ENHANCED Volume Calc] Converting sensor reading: ${rawSensorReading}m, type: ${effectiveSensorType}`)

  if (rawSensorReading === null || rawSensorReading === undefined || isNaN(rawSensorReading)) {
    console.warn(`[ENHANCED Volume Calc] Invalid raw sensor reading: ${rawSensorReading}. Returning 0.`)
    return 0
  }
  if (!totalTankHeight || totalTankHeight <= 0 || isNaN(totalTankHeight)) {
    console.warn(`[ENHANCED Volume Calc] Invalid tank height: ${totalTankHeight}. Returning 0.`)
    return 0
  }
  const compensatedReading = Number(rawSensorReading) + Number(deviceCalibrationOffset || 0)
  const effectiveTankOffsetDepth = Number(tankOffsetDepth || 0)
  console.log(
    `[ENHANCED Volume Calc] Compensated reading: ${compensatedReading}m, offset depth: ${effectiveTankOffsetDepth}m, tank height: ${totalTankHeight}m`,
  )
  let liquidLevel = 0
  try {
    switch (effectiveSensorType) {
      case "ultrasonic":
      case "ultrasonic_level_sensor":
      case "radar":
      case "radar_level_sensor":
      case "laser":
      case "laser_level_sensor":
        const maxRange = Number(sensorConfig.maxSensorRange || totalTankHeight * 1.5)
        const minRange = Number(sensorConfig.minSensorRange || 0.05)
        let effectiveReading = Math.min(compensatedReading, maxRange)
        effectiveReading = Math.max(effectiveReading, minRange)
        liquidLevel = totalTankHeight - effectiveReading - effectiveTankOffsetDepth
        console.log(
          `[ENHANCED Volume Calc] Distance sensor calc: ${totalTankHeight} - ${effectiveReading} - ${effectiveTankOffsetDepth} = ${liquidLevel}m`,
        )
        break
      case "pressure":
      case "pressure_transmitter":
      case "submersible":
      case "submersible_level_sensor":
        const pressureToHeightFactor = Number(sensorConfig.pressureToHeightFactor || 1)
        const heightAtSensor = compensatedReading * pressureToHeightFactor
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
        liquidLevel = compensatedReading + effectiveTankOffsetDepth
        console.log(
          `[ENHANCED Volume Calc] Direct sensor calc: ${compensatedReading} + ${effectiveTankOffsetDepth} = ${liquidLevel}m`,
        )
        break
      case "weight":
      case "load_cell":
        console.warn(`[ENHANCED Volume Calc] Load cell conversion simplified. Ensure reading is already a level.`)
        liquidLevel = compensatedReading + effectiveTankOffsetDepth
        break
      default:
        console.warn(`[ENHANCED Volume Calc] Unknown sensor type: ${effectiveSensorType}. Using direct reading.`)
        liquidLevel = compensatedReading + effectiveTankOffsetDepth
    }

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
 * Calculates the volume of liquid in a tank based on its shape, orientation, dimensions, and liquid level.
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
      case "vertical_elliptical":
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

// --- Tank Shape Specific Volume Calculation Functions ---

function calculateCylindricalVolume(dimensions, liquidLevel, orientation = "vertical") {
  console.log(`[ENHANCED Cylindrical] Input dimensions:`, JSON.stringify(dimensions))
  console.log(`[ENHANCED Cylindrical] Liquid level: ${liquidLevel}m, Orientation: ${orientation}`)
  let radius
  if (dimensions.diameter && !isNaN(dimensions.diameter) && dimensions.diameter > 0) {
    radius = Number(dimensions.diameter) / 2
    console.log(`[ENHANCED Cylindrical] Using diameter ${dimensions.diameter}m -> radius ${radius}m`)
  } else if (dimensions.radius && !isNaN(dimensions.radius) && dimensions.radius > 0) {
    radius = Number(dimensions.radius)
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
    const length = dimensions.length || height
    const diameter = radius * 2
    console.log(`[ENHANCED Cylindrical] Horizontal tank - Length: ${length}m, Diameter: ${diameter}m`)
    if (liquidLevel <= 0) return 0
    if (liquidLevel >= diameter) {
      const fullVolume = PI * radius * radius * length
      console.log(`[ENHANCED Cylindrical] Tank full - Volume: ${fullVolume}m³`)
      return fullVolume
    }
    const h = liquidLevel
    const r = radius
    const cosArg = Math.max(-1, Math.min(1, (r - h) / r))
    const theta = 2 * Math.acos(cosArg)
    const segmentArea = ((r * r) / 2) * (theta - Math.sin(theta))
    const volume = segmentArea * length
    console.log(
      `[ENHANCED Cylindrical] Horizontal segment - h: ${h}m, theta: ${theta.toFixed(3)}, area: ${segmentArea.toFixed(4)}m², volume: ${volume.toFixed(4)}m³`,
    )
    return volume
  } else {
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
  const h = Math.min(liquidLevel, 2 * radius)
  const volume = (PI / 3) * h * h * (3 * radius - h)
  console.log(`[ENHANCED Spherical] Cap height: ${h}m, radius: ${radius}m, volume: ${volume}m³`)
  return volume
}

function calculateConicalVolume(dimensions, liquidLevel) {
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
  const r_liquid = (liquidLevel / height) * radius
  const volume = (PI / 3) * r_liquid * r_liquid * liquidLevel
  console.log(`[ENHANCED Conical] Liquid radius: ${r_liquid}m, volume: ${volume}m³`)
  return volume
}

function calculateSiloVolume(dimensions, liquidLevel) {
  const cylinderRadius = dimensions.diameter / 2
  const totalHeight = dimensions.totalHeight
  const coneAngle = dimensions.coneAngle || 0
  const outletDiameter = dimensions.outletDiameter || 0
  const outletRadius = outletDiameter / 2
  if (!cylinderRadius || !totalHeight || cylinderRadius <= 0 || totalHeight <= 0) {
    throw new Error(`Invalid silo dimensions`)
  }
  let coneHeight = 0
  if (coneAngle > 0 && cylinderRadius > outletRadius) {
    coneHeight = (cylinderRadius - outletRadius) / Math.tan((coneAngle * PI) / 180)
  }
  const cylinderHeight = totalHeight - coneHeight
  if (liquidLevel <= coneHeight) {
    const r1 = outletRadius
    const r2 = outletRadius + (liquidLevel / coneHeight) * (cylinderRadius - outletRadius)
    return (PI / 3) * liquidLevel * (r1 * r1 + r1 * r2 + r2 * r2)
  } else {
    const coneVolume =
      (PI / 3) *
      coneHeight *
      (outletRadius * outletRadius + outletRadius * cylinderRadius + cylinderRadius * cylinderRadius)
    const cylinderVolume = PI * cylinderRadius * cylinderRadius * (liquidLevel - coneHeight)
    return coneVolume + cylinderVolume
  }
}

function calculateOvalVolume(dimensions, liquidLevel, orientation) {
  const a = (dimensions.majorAxis || dimensions.width) / 2
  const b = (dimensions.minorAxis || dimensions.height) / 2
  const length = dimensions.length || dimensions.depth || 1
  if (!a || !b || a <= 0 || b <= 0) {
    throw new Error(`Invalid oval dimensions: a=${a}, b=${b}`)
  }
  if (orientation === "horizontal") {
    const h = Math.min(liquidLevel, b * 2)
    const y = b - h
    const cosArg = Math.max(-1, Math.min(1, y / b))
    const area = a * b * Math.acos(cosArg) - y * Math.sqrt(Math.max(0, b * b - y * y))
    return area * length
  } else {
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
    const segmentArea = calculateCircularSegmentArea(radius, liquidLevel)
    const hemisphereVolume = 2 * calculateSphericalCapVolume(radius, liquidLevel)
    return segmentArea * cylinderLength + hemisphereVolume
  } else {
    const hemisphereHeight = radius
    if (liquidLevel <= hemisphereHeight) {
      return calculateSphericalCapVolume(radius, liquidLevel)
    } else if (liquidLevel <= hemisphereHeight + cylinderLength) {
      const bottomHemisphere = (2 / 3) * PI * radius * radius * radius
      const cylinderVolume = PI * radius * radius * (liquidLevel - hemisphereHeight)
      return bottomHemisphere + cylinderVolume
    } else {
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
  const cylinderVolume = calculateCircularSegmentArea(radius, liquidLevel) * length
  const dishVolume = 2 * calculateSphericalCapVolume(dishRadius, liquidLevel)
  return cylinderVolume + dishVolume
}


// --- Helper Functions ---

/**
 * Calculates the fill percentage of a tank.
 * @param {number} currentVolumeLiters - The calculated current volume in liters.
 * @param {number} totalCapacityLiters - The total capacity of the tank in liters.
 * @returns {number} The fill percentage (0-100).
 */
function calculateFillPercentage(currentVolumeLiters, totalCapacityLiters) {
  if (totalCapacityLiters <= 0) {
    return 0;
  }
  const percentage = (currentVolumeLiters / totalCapacityLiters) * 100;
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Calculates the area of a circular segment.
 * @param {number} radius - The radius of the circle.
 * @param {number} height - The height of the segment.
 * @returns {number} The area in square units.
 */
function calculateCircularSegmentArea(radius, height) {
  if (height <= 0) return 0
  if (height >= 2 * radius) return PI * radius * radius
  const h = height
  const r = radius
  const cosArg = Math.max(-1, Math.min(1, (r - h) / r))
  const theta = 2 * Math.acos(cosArg)
  return ((r * r) / 2) * (theta - Math.sin(theta))
}

/**
 * Calculates the volume of a spherical cap.
 * @param {number} radius - The radius of the sphere.
 * @param {number} height - The height of the cap.
 * @returns {number} The volume in cubic units.
 */
function calculateSphericalCapVolume(radius, height) {
  if (height <= 0) return 0
  if (height >= 2 * radius) return (4 / 3) * PI * radius * radius * radius
  const h = height
  const r = radius
  return (PI / 3) * h * h * (3 * r - h)
}

// --- Module Exports ---
module.exports = {
  processTankVolumeReading,
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
  calculateFillPercentage,
  calculateCircularSegmentArea,
  calculateSphericalCapVolume
};
