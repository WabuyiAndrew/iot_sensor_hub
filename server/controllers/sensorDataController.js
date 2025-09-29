const Joi = require("joi");
const moment = require("moment");
const mongoose = require("mongoose");
const { ErrorResponse } = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");
const externalApiService = require("../services/externalApiService");
const SensorData = require("../models/SensorData");
const Device = require("../models/Device");

// A list of all numerical fields that can be aggregated.
// This is kept here for reference, but not used for analytics in this file anymore.
const aggregatableFields = [
  "temperature", "humidity", "pm25", "pm10", "co2", "atmosphericPressure",
  "windSpeed", "windDir", "rainfall", "totalSolarRadiation", "noise",
  "ultrasonic_liquid_level", "pressure_level", "liquid_level_raw",
  "signalStrength", "battery_level", "errorCode", "versionNumber"
];


/**
 * @desc Get latest analytics snapshot (remains local)
 * @route GET /api/sensor/latest-analytics/:serialNumber
 */
exports.getLatestAnalyticsData = asyncHandler(async (req, res, next) => {
  const { serialNumber } = req.params;

  if (!serialNumber) {
    return next(new ErrorResponse("Missing required parameter: serialNumber", 400));
  }

  const device = await Device.findOne({ serialNumber });
  if (!device) {
    return next(new ErrorResponse(`Device not found with serial: ${serialNumber}`, 404));
  }

  const latestSensorData = await SensorData.findOne({ deviceId: device._id }).sort({ timestamp: -1 });

  if (!latestSensorData) {
    return next(new ErrorResponse("Latest analytics snapshot not found.", 404));
  }

  res.status(200).json({
    success: true,
    data: latestSensorData,
    source: "local_cache",
    timestamp: latestSensorData.timestamp,
  });
});

/**
 * @desc Fetch Raw Sensor Data with Pagination from local database
 * @route GET /api/sensor/sensor-data?page=0&size=10
 * @access Private (Admin or User if authorized for device)
 */
// exports.getRawSensorDataPaginated = asyncHandler(async (req, res, next) => {
//   const page = Number.parseInt(req.query.page) || 0
//   const size = Number.parseInt(req.query.size) || 10
//   const deviceNumber = req.query.deviceNumber
//   const sensorTypeFilter = req.query.deviceType
//   const startDate = req.query.startDate
//   const endDate = req.query.endDate

//   let filter = {}
//   // Build the filter object based on query parameters
//   if (deviceNumber) {
//     // Find the local deviceId using the external deviceNumber (serial number)
//     const device = await Device.findOne({ serialNumber: deviceNumber })
//     if (device) {
//       filter.deviceId = device._id
//     } else {
//       // If no device found, return an empty result
//       return res.status(200).json({
//         content: [],
//         totalElements: 0,
//         totalPages: 0,
//         pageable: { pageNumber: page, pageSize: size },
//         source: "local_database",
//       })
//     }
//   }

//   if (sensorTypeFilter) {
//     filter.sensorType = sensorTypeFilter
//   }

//   if (startDate && endDate) {
//     filter.timestamp = {
//       $gte: new Date(startDate).toISOString(),
//       $lte: new Date(endDate).toISOString(),
//     }
//   }

//   try {
//     const totalElements = await SensorData.countDocuments(filter)
//     const totalPages = Math.ceil(totalElements / size)
//     const content = await SensorData.find(filter)
//       .limit(size)
//       .skip(page * size)
//       .sort({ timestamp: -1 })
//       .lean()

//     // Transform the content to the desired format
//     const formattedContent = content.map((record) => {
//       // Use the sensorId and sensorType from the SensorData model, which
//       // are populated by the ingestion process using the local Device model.
//       const { _id, timestamp, sensorId, sensorType, data, ...restOfFields } = record;
      
//       // const formattedRecord = {
//       //   id: _id,
//       //   dateCreated: timestamp,
//       //   deviceNumber: sensorId, // Use sensorId which corresponds to the device's serialNumber
//       //   deviceType: sensorType,
//       //   data: data,
//       //   ...data, // This will spread the device-specific parameters only
//       // };
//       const formattedRecord = {
//     id: record._id,
//     dateCreated: record.timestamp,
//     deviceNumber: record.sensorId,
//     deviceType: record.sensorType,
//     data: record.data,
//     ...record.data,
// };
// aggregatableFields.forEach(field => {
//     if (record[field] !== undefined && record[field] !== null) {
//         formattedRecord[field] = record[field];
//     }
// });
//       return formattedRecord;
//     })

//     res.status(200).json({
//       content: formattedContent,
//       pageable: {
//         pageNumber: page,
//         pageSize: size,
//         offset: page * size,
//         unpaged: false,
//         paged: true,
//       },
//       totalElements: totalElements,
//       last: page >= totalPages - 1,
//       totalPages: totalPages,
//       numberOfElements: content.length,
//       first: page === 0,
//       size: size,
//       number: page,
//       empty: content.length === 0,
//       source: "local_database",
//     })
//   } catch (error) {
//     console.error("Local Database Error:", error.message)
//     return next(new ErrorResponse(`Failed to fetch sensor data: ${error.message}`, 500))
//   }
// })
exports.getRawSensorDataPaginated = asyncHandler(async (req, res, next) => {
  const { page = 0, size = 10, deviceId } = req.query;
  const filter = {};

  if (deviceId) {
    filter.sensorId = deviceId;
  }

  const totalElements = await SensorData.countDocuments(filter);

  const content = await SensorData.find(filter)
    .limit(parseInt(size))
    .skip(parseInt(page) * parseInt(size))
    .sort({ timestamp: -1 })
    .lean();

  // Transform the content to the desired format, including all fields
  const formattedContent = content.map((record) => {
    const formattedRecord = {
      id: record._id,
      dateCreated: record.timestamp,
      deviceNumber: record.sensorId,
      deviceType: record.sensorType || "unknown",
    };

    // Explicitly add each aggregatable field to the formatted record if it exists
    aggregatableFields.forEach((field) => {
      if (record[field] !== undefined) {
        formattedRecord[field] = record[field];
      }
    });

    return formattedRecord;
  });

  res.status(200).json({
    content: formattedContent,
    pageable: {
      pageNumber: parseInt(page),
      pageSize: parseInt(size),
      offset: parseInt(page) * parseInt(size),
      unpaged: false,
      paged: true,
    },
    totalElements: totalElements,
    last: (parseInt(page) + 1) * parseInt(size) >= totalElements,
    totalPages: Math.ceil(totalElements / parseInt(size)),
    numberOfElements: formattedContent.length,
    first: parseInt(page) === 0,
    size: parseInt(size),
    number: parseInt(page),
    empty: formattedContent.length === 0,
    source: "local_database",
  });
});

/**
 * @desc Get sensor data by device serial number and parameter from local database
 * @route GET /api/sensordata/device/:serialNumber/:parameter
 * @access Private/Admin, User (if authorized)
 */
exports.getSensorDataByDeviceIdAndParameter = asyncHandler(async (req, res, next) => {
  const { serialNumber, parameter } = req.params
  const { hours = 24, limit = 100, startDate, endDate } = req.query

  // Validate parameter
  const allowedParameters = [
    "temperature",
    "humidity",
    "pm2_5",
    "pm10",
    "co2",
    "atmospheric_pressure",
    "wind_speed",
    "wind_direction",
    "rainfall",
    "total_solar_radiation",
    "noise",
    "ultrasonic_liquid_level",
    "pressure_level",
    "liquid_level_raw",
    "signal_rssi_raw",
    "signal_rssi_dbm",
    "level",
    "battery_level",
    "error_code",
    "version",
  ]

  if (!allowedParameters.includes(parameter)) {
    return next(
      new ErrorResponse(
        `Invalid parameter: ${parameter}. Allowed parameters are: ${allowedParameters.join(", ")}`,
        400,
        "VALIDATION_ERROR",
      ),
    )
  }

  try {
    // Find the local deviceId using the serial number
    const device = await Device.findOne({ serialNumber: serialNumber })
    if (!device) {
      return next(new ErrorResponse(`Device not found with serial number ${serialNumber}`, 404, "NOT_FOUND"))
    }

    let queryStartDate, queryEndDate

    if (startDate && endDate) {
      queryStartDate = startDate
      queryEndDate = endDate
    } else {
      const endDateTime = new Date()
      const startDateTime = new Date(endDateTime.getTime() - Number.parseInt(hours) * 60 * 60 * 1000)
      queryStartDate = startDateTime.toISOString()
      queryEndDate = endDateTime.toISOString()
    }

    // Query the local database for sensor data
    const sensorData = await SensorData.find({
      deviceId: device._id,
      timestamp: { $gte: queryStartDate, $lte: queryEndDate },
      [parameter]: { $exists: true, $ne: null },
    })
      .sort({ timestamp: -1 })
      .limit(Number.parseInt(limit))
      .lean()

    // Filter and transform data to only include the requested parameter
    const data = sensorData.map((record) => ({
      timestamp: record.timestamp,
      [parameter]: record[parameter],
    }))

    res.status(200).json({
      success: true,
      count: data.length,
      data: data,
      source: "local_database",
      query: {
        serialNumber,
        parameter,
        hours: Number.parseInt(hours),
        limit: Number.parseInt(limit),
        startDate: queryStartDate,
        endDate: queryEndDate,
      },
    })
  } catch (error) {
    console.error("Local Database Error:", error.message)
    return next(new ErrorResponse(`Failed to fetch sensor data: ${error.message}`, 500))
  }
})

/**
 * @desc Get sensor data by ID from local database
 * @route GET /api/sensordata/:id
 * @access Private/Admin, User (if authorized)
 */
exports.getSensorDataById = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  try {
    const record = await SensorData.findById(id).lean()

    if (!record) {
      return next(new ErrorResponse(`Sensor data not found with ID ${id}`, 404, "NOT_FOUND"))
    }

    res.status(200).json({
      success: true,
      data: record,
      source: "local_database",
    })
  } catch (error) {
    console.error("Local Database Error:", error.message)
    return next(new ErrorResponse(`Failed to fetch sensor data: ${error.message}`, 500))
  }
})

/**
 * @desc Create a new sensor data reading by fetching from external API
 * @route POST /api/sensordata/raw-data
 * @access Private/Admin, User (if authorized)
 */
exports.createSensorDataReading = asyncHandler(async (req, res, next) => {
  try {
    console.log("Ingestion process started.")
    // Fetch raw data from the external API without a specific device ID.
    const externalData = await externalApiService.getSensorData()

    if (!externalData.data || !externalData.data.content || externalData.data.content.length === 0) {
      console.log("No new data found from external API.")
      return next(new ErrorResponse("No new data found from external API", 404))
    }
    
    console.log(`Found ${externalData.data.content.length} records to ingest.`)

    const newSensorReadings = []
    for (const record of externalData.data.content) {
      // Find the corresponding device in the local database using the deviceNumber
      const device = await Device.findOne({ serialNumber: record.deviceNumber })

      // If a local device is found, proceed with ingestion
      if (device) {
        // Check for duplicates based on local device ID and timestamp
        const existingReading = await SensorData.findOne({
          deviceId: device._id,
          timestamp: record.dateCreated,
        })

        if (existingReading) {
          console.log(`Duplicate sensor data found for device ${device.serialNumber} at ${record.dateCreated}. Skipping.`)
          continue
        }

        // Create a new reading using data from both the external API and the local device.
        // The sensorId and sensorType fields are now properly populated from the local device model.
        console.log(`Attempting to save reading for device: ${device.serialNumber}`)
        const newReading = await SensorData.create({
          deviceId: device._id,
          sensorId: device.serialNumber,
          sensorType: device.type, // <-- Now using the device's type from the local database
          timestamp: record.dateCreated,
          data: record.data, // Dynamically save the entire 'data' object
          // Extract and save individual sensor values from the raw data payload for easier querying
          temperature: record.data.temperature,
          humidity: record.data.humidity,
          ultrasonic_liquid_level: record.data.ultrasonic_liquid_level,
          pressure_level: record.data.pressure_level,
          liquid_level_raw: record.data.liquid_level_raw,
          battery_level: record.data.battery_level,
          signal_rssi_dbm: record.data.signal_rssi_dbm,
          pm2_5: record.data.pm2_5,
          pm10: record.data.pm10,
          co2: record.data.co2,
          atmospheric_pressure: record.data.atmospheric_pressure,
          wind_speed: record.data.wind_speed,
          wind_direction: record.data.wind_direction,
          rainfall: record.data.rainfall,
          total_solar_radiation: record.data.total_solar_radiation,
          level: record.data.level,
          noise: record.data.noise,
          error_code: record.data.error_code,
        })
        newSensorReadings.push(newReading)
        console.log(`Successfully saved new reading with ID: ${newReading._id}`)
      } else {
        console.log(`Device not found for serial number ${record.deviceNumber}. Skipping.`)
        continue
      }
    }
    console.log(`Ingestion completed. Saved ${newSensorReadings.length} new records.`)

    res.status(201).json({
      success: true,
      count: newSensorReadings.length,
      data: newSensorReadings,
      source: "local_database_ingestion",
    })
  } catch (error) {
    console.error("Ingestion Error:", error.message)
    return next(new ErrorResponse(`Failed to create sensor data reading: ${error.message}`, error.statusCode || 500))
  }
})

// Functions that require local database operations remain unchanged but return not implemented errors
exports.cleanupOldSensorData = asyncHandler(async (req, res, next) => {
  return next(new ErrorResponse("Sensor data cleanup requires local database operations", 501))
})
