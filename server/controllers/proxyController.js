const axios = require("axios")
const { ErrorResponse } = require("../utils/errorResponse")
const asyncHandler = require("../middleware/asyncHandler")

// Define the mapping between your local device names and the external API names.
// This is the core of the data transformation layer. This list is now based on the Device.js model.
const DEVICE_TYPE_MAPPING = {
  // Existing mappings
  "WaterLevelSensor_1": "Level1",
  "Weather_Station": "WeatherS",
  "Flow_Meter_2": "Level2",
  // Mappings based on the Device.js Mongoose schema
  "air_quality": "AirQuality",
  "weather": "Weather",
  "liquid_level": "Level1", // Corrected mapping for liquid level sensors
  "multi_sensor": "MultiSensor",
  "generic": "Generic",
  "temperature_humidity_sensor": "TempHumid",
  "ultrasonic_level_sensor": "Level2", // Corrected mapping for ultrasonic sensors
  "radar_level_sensor": "Level2", // Corrected mapping for radar sensors
  "pressure_transmitter": "Pressure",
  "submersible_level_sensor": "Submersible",
  "guided_wave_radar": "GuidedWave",
  "laser_level_sensor": "Laser",
  "float_switch": "FloatSwitch",
  "capacitive_level_sensor": "Capacitive",
  "vibrating_fork": "VibratingFork",
  "load_cell": "LoadCell",
};

// A helper function to create a reverse mapping for incoming data.
const getReverseMapping = () => {
  const reverseMap = {};
  for (const localName in DEVICE_TYPE_MAPPING) {
    const externalName = DEVICE_TYPE_MAPPING[localName];
    reverseMap[externalName] = localName;
  }
  return reverseMap;
};

const REVERSE_DEVICE_TYPE_MAPPING = getReverseMapping();

// Base URL for the external IoT API
const EXTERNAL_API_BASE_URL = "http://188.166.125.28/nkusu-iot/api/nkusu-iot"

// Create axios instance with default config
const externalApiClient = axios.create({
  baseURL: EXTERNAL_API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "2tume-proxy-server/1.0",
  },
})

// Add request/response interceptors for logging
externalApiClient.interceptors.request.use(
  (config) => {
    console.log(`🌐 [Proxy] Making request to: ${config.baseURL}${config.url}`)
    return config
  },
  (error) => {
    console.error("🚫 [Proxy] Request error:", error.message)
    return Promise.reject(error)
  },
)

externalApiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [Proxy] Response received: ${response.status} ${response.statusText}`)
    return response
  },
  (error) => {
    console.error("❌ [Proxy] Response error:", error.response?.status, error.response?.statusText)
    return Promise.reject(error)
  },
)

/**
 * @desc Fetch device status from external API
 * @route GET /api/proxy/device-status?devices=device1,device2,device3
 * @access Private (requires authentication)
 */
exports.getDeviceStatus = asyncHandler(async (req, res, next) => {
  const { devices } = req.query

  if (!devices) {
    return next(new ErrorResponse("Devices parameter is required", 400, "MISSING_DEVICES"))
  }

  try {
    const response = await externalApiClient.get("/status", {
      params: { devices },
    })

    console.log(`📊 [Proxy] Device status fetched for devices: ${devices}`)

    res.status(200).json({
      success: true,
      data: response.data,
      source: "external_api",
      timestamp: new Date().toISOString(),
      requestedDevices: devices.split(",").map((d) => d.trim()),
    })
  } catch (error) {
    console.error("❌ [Proxy] Error fetching device status:", error.message)

    if (error.response) {
      // External API returned an error response
      return next(
        new ErrorResponse(
          `External API error: ${error.response.statusText}`,
          error.response.status,
          "EXTERNAL_API_ERROR",
        ),
      )
    } else if (error.request) {
      // Request was made but no response received
      return next(new ErrorResponse("External API is not responding", 503, "EXTERNAL_API_TIMEOUT"))
    } else {
      // Something else happened
      return next(new ErrorResponse("Failed to fetch device status", 500, "PROXY_ERROR"))
    }
  }
})

/**
 * @desc Fetch analytics sensor data from external API
 * @route GET /api/proxy/analytics-data?startDate=2025-07-01&period=MONTHLY&deviceType=WaterLevelSensor_1&deviceNo=12345
 * @access Private (requires authentication)
 */
exports.getAnalyticsData = asyncHandler(async (req, res, next) => {
  const { startDate, period, deviceType, deviceNo } = req.query

  // Validate required parameters
  const validationErrors = []
  if (!startDate) validationErrors.push("startDate is required")
  if (!period) validationErrors.push("period is required")
  if (!deviceType) validationErrors.push("deviceType is required")
  // Note: deviceNo is an optional parameter to filter by a specific device.

  if (validationErrors.length > 0) {
    return next(new ErrorResponse(validationErrors.join(", "), 400, "VALIDATION_ERROR"))
  }

  // Validate period values
  const validPeriods = ["DAILY", "WEEKLY", "MONTHLY"]
  if (!validPeriods.includes(period.toUpperCase())) {
    return next(new ErrorResponse(`Invalid period. Must be one of: ${validPeriods.join(", ")}`, 400, "INVALID_PERIOD"))
  }

  try {
    // Look up the external API's deviceType name from our internal mapping
    const externalDeviceType = DEVICE_TYPE_MAPPING[deviceType] || deviceType;
    console.log(`✨ [Proxy] Mapping local '${deviceType}' to external '${externalDeviceType}' for API request.`);

    const params = {
      startDate,
      period: period.toUpperCase(),
      deviceType: externalDeviceType,
    };

    // Conditionally add the deviceNo parameter if it exists in the query
    // The calling service is responsible for mapping the local serialNumber to the external deviceNo.
    if (deviceNo) {
      params.deviceNo = deviceNo;
    }

    const response = await externalApiClient.get("/analytic-data", { params })

    // Reverse the mapping for the incoming data before sending the response
    const transformedData = response.data.map(item => ({
      ...item,
      deviceType: REVERSE_DEVICE_TYPE_MAPPING[item.deviceType] || item.deviceType
    }));

    console.log(`📈 [Proxy] Analytics data fetched for ${externalDeviceType} (${period}, ${startDate})`);

    res.status(200).json({
      success: true,
      data: transformedData,
      source: "external_api",
      timestamp: new Date().toISOString(),
      query: {
        startDate,
        period: period.toUpperCase(),
        deviceType, // Keep the original local name in the response query info
        deviceNo: deviceNo || null
      },
    })
  } catch (error) {
    console.error("❌ [Proxy] Error fetching analytics data:", error.message)

    if (error.response) {
      return next(
        new ErrorResponse(
          `External API error: ${error.response.statusText}`,
          error.response.status,
          "EXTERNAL_API_ERROR",
        ),
      )
    } else if (error.request) {
      return next(new ErrorResponse("External API is not responding", 503, "EXTERNAL_API_TIMEOUT"))
    } else {
      return next(new ErrorResponse("Failed to fetch analytics data", 500, "PROXY_ERROR"))
    }
  }
})

/**
 * @desc Fetch raw sensor data from external API with pagination
 * @route GET /api/proxy/sensor-data?page=0&size=10&deviceNumber=device1&deviceType=WaterLevelSensor_1
 * @access Private (requires authentication)
 */
exports.getRawSensorData = asyncHandler(async (req, res, next) => {
  const { page = 0, size = 10, deviceNumber, deviceType } = req.query

  // Validate pagination parameters
  const pageNum = Number.parseInt(page)
  const sizeNum = Number.parseInt(size)

  if (isNaN(pageNum) || pageNum < 0) {
    return next(new ErrorResponse("Page must be a non-negative integer", 400, "INVALID_PAGE"))
  }

  if (isNaN(sizeNum) || sizeNum < 1 || sizeNum > 100) {
    return next(new ErrorResponse("Size must be between 1 and 100", 400, "INVALID_SIZE"))
  }

  try {
    const params = {
      page: pageNum,
      size: sizeNum,
    }

    // Add optional filters
    if (deviceNumber) params.deviceNumber = deviceNumber
    // Apply mapping for deviceType if it exists
    if (deviceType) {
      const externalDeviceType = DEVICE_TYPE_MAPPING[deviceType] || deviceType;
      console.log(`✨ [Proxy] Mapping local '${deviceType}' to external '${externalDeviceType}' for API request.`);
      params.deviceType = externalDeviceType;
    }

    const response = await externalApiClient.get("/sensor-data", { params })

    // Reverse the mapping for the incoming data before sending the response
    const transformedData = response.data.map(item => ({
      ...item,
      deviceType: REVERSE_DEVICE_TYPE_MAPPING[item.deviceType] || item.deviceType
    }));

    console.log(`📡 [Proxy] Raw sensor data fetched (page: ${pageNum}, size: ${sizeNum})`)

    res.status(200).json({
      success: true,
      data: transformedData,
      source: "external_api",
      timestamp: new Date().toISOString(),
      pagination: {
        page: pageNum,
        size: sizeNum,
        totalElements: response.data.totalElements || 0,
        totalPages: response.data.totalPages || 0,
      },
      filters: {
        deviceNumber: deviceNumber || null,
        deviceType: deviceType || null, // Keep the original local name in the response filters
      },
    })
  } catch (error) {
    console.error("❌ [Proxy] Error fetching raw sensor data:", error.message)

    if (error.response) {
      return next(
        new ErrorResponse(
          `External API error: ${error.response.statusText}`,
          error.response.status,
          "EXTERNAL_API_ERROR",
        ),
      )
    } else if (error.request) {
      return next(new ErrorResponse("External API is not responding", 503, "EXTERNAL_API_TIMEOUT"))
    } else {
      return next(new ErrorResponse("Failed to fetch raw sensor data", 500, "PROXY_ERROR"))
    }
  }
})

/**
 * @desc Health check for external API connectivity
 * @route GET /api/proxy/health
 * @access Private (requires authentication)
 */
exports.checkExternalApiHealth = asyncHandler(async (req, res, next) => {
  try {
    const startTime = Date.now()

    // Make a simple request to check connectivity
    const response = await externalApiClient.get("/sensor-data", {
      params: { page: 0, size: 1 },
      timeout: 5000, // 5 second timeout for health check
    })

    const responseTime = Date.now() - startTime

    res.status(200).json({
      success: true,
      message: "External API is healthy",
      externalApi: {
        status: "connected",
        responseTime: `${responseTime}ms`,
        baseUrl: EXTERNAL_API_BASE_URL,
        lastChecked: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ [Proxy] External API health check failed:", error.message)

    res.status(503).json({
      success: false,
      message: "External API is not healthy",
      externalApi: {
        status: "disconnected",
        error: error.message,
        baseUrl: EXTERNAL_API_BASE_URL,
      },
    })
  }
})
