const Joi = require("joi")
const moment = require("moment")
const mongoose = require("mongoose")
const { ErrorResponse } = require("../utils/errorResponse")
const asyncHandler = require("../middleware/asyncHandler")
const externalApiService = require("../services/externalApiService")

/**
 * @desc Fetch Raw Sensor Data with Pagination from external API
 * @route GET /api/sensor/sensor-data?page=0&size=10
 * @access Private (Admin or User if authorized for device)
 */
exports.getRawSensorDataPaginated = asyncHandler(async (req, res, next) => {
  const page = Number.parseInt(req.query.page) || 0
  const size = Number.parseInt(req.query.size) || 10
  const deviceSerialNumber = req.query.deviceNumber
  const sensorTypeFilter = req.query.deviceType
  const startDate = req.query.startDate
  const endDate = req.query.endDate

  try {
    const externalData = await externalApiService.getSensorData({
      page,
      size,
      deviceId: deviceSerialNumber,
      sensorType: sensorTypeFilter,
      startDate,
      endDate,
    })

    if (!externalData.data?.content?.length) {
      return res.status(200).json({
        content: [],
        pageable: { pageNumber: page, pageSize: size, offset: page * size, paged: true, unpaged: false },
        totalElements: 0,
        totalPages: 0,
        last: true,
        first: true,
        numberOfElements: 0,
        size,
        number: page,
        empty: true,
        source: "external_api",
      })
    }

    // Transform external API data
    const content = externalData.data.content.map((record) => ({
      id: record.id || record._id,
      dateCreated: record.timestamp || record.dateCreated,
      deviceNumber: record.deviceNumber || record.deviceId,
      deviceType: record.deviceType || record.sensorType || "unknown",
      data: record.data || {
        header: record.header || "N/A",
        version: record.version || "N/A",
        deviceNumber: record.deviceNumber || record.deviceId,
        session: record.session || "N/A",
        order: record.order || "N/A",
        length: record.length || "N/A",
        body: record.body || [],
        end: record.end || "N/A",
      },
      temperature: record.temperature,
      humidity: record.humidity,
      ultrasonic_liquid_level: record.ultrasonic_liquid_level,
      pressure_level: record.pressure_level,
      liquid_level_raw: record.liquid_level_raw,
      battery_level: record.battery_level,
      signal_rssi_dbm: record.signal_rssi_dbm,
    }))

    const totalElements = externalData.data.totalElements || content.length
    const totalPages = Math.ceil(totalElements / size)

    res.status(200).json({
      content,
      pageable: { pageNumber: page, pageSize: size, offset: page * size, paged: true, unpaged: false },
      filterMetadata: { deviceTypes: externalData.data.filterMetadata?.deviceTypes || ["Level1", "multi_sensor"] },
      totalElements,
      last: page >= totalPages - 1,
      totalPages,
      numberOfElements: content.length,
      first: page === 0,
      size,
      number: page,
      empty: content.length === 0,
      source: "external_api",
      timestamp: externalData.timestamp,
    })
  } catch (error) {
    console.error("External API Error:", error.message)
    return next(new ErrorResponse(`Failed to fetch sensor data: ${error.message}`, error.statusCode || 500))
  }
})

/**
 * @desc Get sensor data by device ID and parameter from external API
 * @route GET /api/sensor/:deviceId/:parameter
 * @access Private/Admin or authorized User
 */
exports.getSensorDataByDeviceIdAndParameter = asyncHandler(async (req, res, next) => {
  const { deviceId, parameter } = req.params
  const { hours = 24, limit = 100, startDate, endDate } = req.query

  const allowedParameters = [
    "temperature", "humidity", "pm2_5", "pm10", "co2",
    "atmospheric_pressure", "wind_speed", "wind_direction",
    "rainfall", "total_solar_radiation", "noise",
    "ultrasonic_liquid_level", "pressure_level", "liquid_level_raw",
    "signal_rssi_raw", "signal_rssi_dbm", "battery_level",
    "error_code", "version"
  ]

  if (!allowedParameters.includes(parameter)) {
    return next(new ErrorResponse(`Invalid parameter: ${parameter}. Allowed: ${allowedParameters.join(", ")}`, 400, "VALIDATION_ERROR"))
  }

  let queryStartDate = startDate
  let queryEndDate = endDate

  if (!startDate || !endDate) {
    const endDateTime = new Date()
    const startDateTime = new Date(endDateTime.getTime() - Number.parseInt(hours) * 60 * 60 * 1000)
    queryStartDate = startDateTime.toISOString().split("T")[0]
    queryEndDate = endDateTime.toISOString().split("T")[0]
  }

  try {
    const externalData = await externalApiService.getSensorData({
      deviceId,
      startDate: queryStartDate,
      endDate: queryEndDate,
      page: 0,
      size: Number.parseInt(limit),
    })

    const sensorData = externalData.data?.content || []

    const data = sensorData
      .filter((record) => record[parameter] !== null && record[parameter] !== undefined)
      .map((record) => ({ timestamp: record.timestamp, [parameter]: record[parameter] }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.status(200).json({
      success: true,
      count: data.length,
      data,
      source: "external_api",
      query: { deviceId, parameter, hours: Number.parseInt(hours), limit: Number.parseInt(limit), startDate: queryStartDate, endDate: queryEndDate },
      timestamp: externalData.timestamp,
    })
  } catch (error) {
    console.error("External API Error:", error.message)
    return next(new ErrorResponse(`Failed to fetch sensor data: ${error.message}`, error.statusCode || 500))
  }
})

/**
 * @desc Get sensor data by ID from external API
 * @route GET /api/sensor/:id
 * @access Private/Admin or authorized User
 */
exports.getSensorDataById = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  try {
    const externalData = await externalApiService.getSensorData({ page: 0, size: 100 })
    const sensorData = externalData.data?.content || []
    const record = sensorData.find((item) => item.id === id || item._id === id)

    if (!record) {
      return next(new ErrorResponse(`Sensor data not found with ID ${id}`, 404, "NOT_FOUND"))
    }

    res.status(200).json({
      success: true,
      data: record,
      source: "external_api",
      timestamp: externalData.timestamp,
    })
  } catch (error) {
    console.error("External API Error:", error.message)
    return next(new ErrorResponse(`Failed to fetch sensor data: ${error.message}`, error.statusCode || 500))
  }
})

/**
 * @desc Placeholder for local DB operations
 */
exports.createSensorDataReading = asyncHandler(async (req, res, next) => {
  return next(new ErrorResponse("Sensor data creation requires local database operations", 501))
})

exports.cleanupOldSensorData = asyncHandler(async (req, res, next) => {
  return next(new ErrorResponse("Sensor data cleanup requires local database operations", 501))
})
