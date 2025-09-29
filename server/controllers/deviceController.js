// // const mongoose = require("mongoose")
const { ErrorResponse } = require("../utils/errorResponse")
const asyncHandler = require("../middleware/asyncHandler")
const externalApiService = require("../services/externalApiService")
const Device = require("../models/Device") // Import the Device model
const SensorData = require("../models/SensorData") // Add SensorData model import

// Helper function to normalize status values
const normalizeStatus = (status) => {
  if (!status) return "offline"
  
  const statusStr = status.toString().toLowerCase()
  
  // Map various status formats to our enum values
  switch (statusStr) {
    case "on":
    case "online":
    case "active":
    case "connected":
      return "online"
    case "off":
    case "offline":
    case "inactive":
    case "disconnected":
      return "offline"
    case "maintenance":
    case "repair":
    case "updating":
      return "maintenance"
    default:
      console.warn(`Unknown status value: ${status}, defaulting to offline`)
      return "offline"
  }
}

// @desc    Create new device
// @route   POST /api/devices
// @access  Private/Admin
const createDevice = asyncHandler(async (req, res, next) => {
  try {
    const {
      name,
      serialNumber,
      type,
      status = "offline", // Default to offline
      isTankCompatible = false,
      assignedToUser,
      tankType,
      location,
      gpsCoordinates,
      firmwareVersion,
      batteryLevel,
      parameters = {},
      metadata = {},
      installationDate,
      isActive = true,
    } = req.body

    // Enhanced validation for required fields
    if (!serialNumber || !name || !type) {
      return next(new ErrorResponse("Required fields: serialNumber, name, and type are missing.", 400))
    }

    // Normalize the status value
    const normalizedStatus = normalizeStatus(status)
    console.log(`DeviceController: Status normalized from '${status}' to '${normalizedStatus}'`)

    // Check for duplicate serial number
    const existingDevice = await Device.findOne({ serialNumber })
    if (existingDevice) {
      return next(new ErrorResponse("Device with this serial number already exists", 400))
    }

    // Create a new device document with all fields
    const newDevice = new Device({
      name,
      serialNumber,
      type,
      status: normalizedStatus, // Use normalized status
      isTankCompatible,
      assignedToUser,
      tankType,
      location,
      gpsCoordinates,
      firmwareVersion,
      batteryLevel,
      parameters,
      metadata,
      installationDate,
      isActive,
      lastSeen: new Date(),
      createdAt: new Date(),
    })

    // Save the new device to the database
    const device = await newDevice.save()

    res.status(201).json({
      success: true,
      data: device,
      message: `Device with serial number ${serialNumber} created successfully.`,
    })
  } catch (error) {
    console.error("Error creating device:", error.message)
    
    // Handle Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return next(new ErrorResponse(`Validation failed: ${validationErrors.join(', ')}`, 400))
    }
    
    return next(new ErrorResponse(`Failed to create device: ${error.message}`, 500))
  }
})

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
const getAllDevices = asyncHandler(async (req, res) => {
  const { search, sortBy = "name", sortOrder = "asc", status, type } = req.query

  const query = {}

  // Add search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { serialNumber: { $regex: search, $options: "i" } },
      { type: { $regex: search, $options: "i" } },
    ]
  }

  // Add status filter - normalize the status value
  if (status) {
    query.status = normalizeStatus(status)
  }

  // Add type filter
  if (type) {
    query.type = type
  }

  const sortOptions = {}
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1

  const devices = await Device.find(query).populate("assignedToUser", "name email").sort(sortOptions)

  // Normalize status values in response
  const normalizedDevices = devices.map(device => ({
    ...device.toObject(),
    status: normalizeStatus(device.status)
  }))

  res.status(200).json({
    success: true,
    count: normalizedDevices.length,
    data: normalizedDevices,
  })
})

// @desc    Get single device
// @route   GET /api/devices/:id
// @access  Private
const getDeviceById = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id).populate("assignedToUser", "name email")

  if (!device) {
    return res.status(404).json({
      success: false,
      message: "Device not found",
    })
  }

  // Normalize status in response
  const deviceData = {
    ...device.toObject(),
    status: normalizeStatus(device.status)
  }

  res.status(200).json({
    success: true,
    data: deviceData,
  })
})

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private/Admin
const updateDevice = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Basic validation
    if (!id) {
      return next(new ErrorResponse("Device ID is required", 400))
    }

    // Find the device first
    let device = await Device.findById(id)
    if (!device) {
      return next(new ErrorResponse(`Device not found with ID of ${id}`, 404))
    }

    // Normalize status value if it's being updated
    if (updateData.status) {
      updateData.status = normalizeStatus(updateData.status)
      console.log(`DeviceController: Status normalized from '${req.body.status}' to '${updateData.status}'`)
    }

    // Validate status against enum values
    const validStatuses = ["online", "offline", "maintenance"]
    if (updateData.status && !validStatuses.includes(updateData.status)) {
      return next(new ErrorResponse(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`, 400))
    }

    // Check for duplicate serial number if it's being updated
    if (updateData.serialNumber && updateData.serialNumber !== device.serialNumber) {
      const existingDevice = await Device.findOne({
        serialNumber: updateData.serialNumber,
        _id: { $ne: id },
      })

      if (existingDevice) {
        return next(new ErrorResponse("Device with this serial number already exists", 400))
      }
    }

    // Update the device
    device = await Device.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      success: true,
      data: device,
      message: `Device ${device.serialNumber} updated successfully.`,
    })
  } catch (error) {
    console.error("Error updating device:", error.message)
    
    // Handle Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return next(new ErrorResponse(`Validation failed: ${validationErrors.join(', ')}`, 400))
    }
    
    return next(new ErrorResponse(`Failed to update device: ${error.message}`, 500))
  }
})

// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Private/Admin
const deleteDevice = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params

    // Basic validation
    if (!id) {
      return next(new ErrorResponse("Device ID is required", 400))
    }

    // Find the device first
    const device = await Device.findById(id)
    if (!device) {
      return next(new ErrorResponse(`Device not found with ID of ${id}`, 404))
    }

    // Delete the device
    await Device.findByIdAndDelete(id)

    res.status(200).json({
      success: true,
      message: `Device ${device.serialNumber} deleted successfully.`,
    })
  } catch (error) {
    console.error("Error deleting device:", error.message)
    return next(new ErrorResponse(`Failed to delete device: ${error.message}`, 500))
  }
})

// @desc    Get devices assigned to current user
// @route   GET /api/devices/my-devices
// @access  Private
const getMyDevices = asyncHandler(async (req, res) => {
  // Log the user ID to confirm it's being passed correctly
  console.log("Authenticated User ID:", req.user.id);
  
  // THIS IS THE CORRECT AND ONLY REQUIRED QUERY
  const devices = await Device.find({ assignedToUser: req.user.id }).populate("assignedToUser", "name email");

  // Normalize status values in response
  const normalizedDevices = devices.map(device => ({
    ...device.toObject(),
    status: normalizeStatus(device.status)
  }));

  res.status(200).json({
    success: true,
    count: normalizedDevices.length,
    data: normalizedDevices,
  });
});

// @desc    Get unassigned devices
// @route   GET /api/devices/unassigned
// @access  Private/Admin
const getUnassignedDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find({ assignedToUser: null })

  // Normalize status values in response
  const normalizedDevices = devices.map(device => ({
    ...device.toObject(),
    status: normalizeStatus(device.status)
  }))

  res.status(200).json({
    success: true,
    count: normalizedDevices.length,
    data: normalizedDevices,
  })
})

// @desc    Get tank capable devices
// @route   GET /api/devices/tank-capable
// @access  Private
const getTankCapableDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find({ isTankCompatible: true }).populate("assignedToUser", "name email")

  // Normalize status values in response
  const normalizedDevices = devices.map(device => ({
    ...device.toObject(),
    status: normalizeStatus(device.status)
  }))

  res.status(200).json({
    success: true,
    count: normalizedDevices.length,
    data: normalizedDevices,
  })
})

// @desc    Get device statistics
// @route   GET /api/devices/stats
// @access  Private/Admin
const getDeviceStats = asyncHandler(async (req, res) => {
  const totalDevices = await Device.countDocuments()
  const activeDevices = await Device.countDocuments({ status: "online" })
  const inactiveDevices = await Device.countDocuments({ status: "offline" })
  const maintenanceDevices = await Device.countDocuments({ status: "maintenance" })
  const assignedDevices = await Device.countDocuments({ assignedToUser: { $ne: null } })
  const unassignedDevices = await Device.countDocuments({ assignedToUser: null })

  // Get device types count
  const deviceTypes = await Device.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ])

  res.status(200).json({
    success: true,
    data: {
      total: totalDevices,
      online: activeDevices,
      offline: inactiveDevices,
      maintenance: maintenanceDevices,
      assigned: assignedDevices,
      unassigned: unassignedDevices,
      byType: deviceTypes,
    },
  })
})

// FIXED: Implement the missing latest sensor data endpoint
// @desc    Get latest sensor data for device by serial number
// @route   GET /api/devices/sensor-data/latest/:serialNumber
// @access  Private
const getLatestSensorDataForDevice = asyncHandler(async (req, res, next) => {
  try {
    const { serialNumber } = req.params;
    const { deviceType } = req.query;

    if (!serialNumber) {
      return next(new ErrorResponse("Serial number is required", 400));
    }

    console.log(`Fetching latest sensor data for device: ${serialNumber}, type: ${deviceType}`);

    // Find the device by serial number
    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return next(new ErrorResponse(`Device not found with serial number: ${serialNumber}`, 404));
    }

    // Get the latest sensor reading from local database
    const latestReading = await SensorData.findOne({ 
      deviceId: device._id 
    })
    .sort({ timestamp: -1 })
    .lean();

    if (!latestReading) {
      return res.status(200).json({
        success: true,
        data: {},
        message: `No sensor data found for device ${serialNumber}`,
        source: "local_database"
      });
    }

    // Remove MongoDB-specific fields and format the response
    const { _id, deviceId, __v, ...sensorData } = latestReading;
    
    res.status(200).json({
      success: true,
      data: {
        ...sensorData,
        deviceType: device.type,
        serialNumber: device.serialNumber
      },
      source: "local_database",
      timestamp: sensorData.timestamp
    });

  } catch (error) {
    console.error("Error fetching latest sensor data:", error);
    return next(new ErrorResponse(`Failed to fetch latest sensor data: ${error.message}`, 500));
  }
});

// Placeholder functions for other operations that might need external API integration
const linkDeviceToTank = asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Tank linking functionality not implemented yet",
  })
})

const unlinkDeviceFromTank = asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Tank unlinking functionality not implemented yet",
  })
})

const triggerVolumeProcessingForDevice = asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Volume processing functionality not implemented yet",
  })
})

const getMyDevicesSensorData = asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Sensor data functionality not implemented yet",
  })
})

const getDeviceHistory = asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Device history functionality not implemented yet",
  })
})

const getAllDevicesSensorData = asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: "All devices sensor data functionality not implemented yet",
  })
})

const getDeviceStatus = asyncHandler(async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const { includeDetails = false } = req.query;

    // If serialNumber is provided, get status for specific device
    if (serialNumber) {
      const device = await Device.findOne({ serialNumber })
        .select('name serialNumber type status lastSeen lastStatusCheck batteryLevel signalStrength firmware location')
        .lean();

      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Device not found with serial number: ${serialNumber}`,
        });
      }

      // Normalize status
      const deviceStatus = {
        serialNumber: device.serialNumber,
        name: device.name,
        type: device.type,
        status: normalizeStatus(device.status),
        lastSeen: device.lastSeen,
        lastStatusCheck: device.lastStatusCheck,
      };

      // Include additional details if requested
      if (includeDetails === 'true') {
        deviceStatus.batteryLevel = device.batteryLevel;
        deviceStatus.signalStrength = device.signalStrength;
        deviceStatus.firmware = device.firmware;
        deviceStatus.location = device.location;
      }

      return res.status(200).json({
        success: true,
        data: deviceStatus,
        source: "local_database",
        lastUpdated: device.lastStatusCheck,
      });
    }

    // If no serialNumber provided, get status for all devices
    const devices = await Device.find({})
      .select('name serialNumber type status lastSeen lastStatusCheck batteryLevel signalStrength firmware location')
      .lean();

    const deviceStatuses = devices.map(device => {
      const deviceStatus = {
        serialNumber: device.serialNumber,
        name: device.name,
        type: device.type,
        status: normalizeStatus(device.status),
        lastSeen: device.lastSeen,
        lastStatusCheck: device.lastStatusCheck,
      };

      // Include additional details if requested
      if (includeDetails === 'true') {
        deviceStatus.batteryLevel = device.batteryLevel;
        deviceStatus.signalStrength = device.signalStrength;
        deviceStatus.firmware = device.firmware;
        deviceStatus.location = device.location;
      }

      return deviceStatus;
    });

    // Calculate summary statistics
    const summary = {
      total: devices.length,
      online: devices.filter(d => normalizeStatus(d.status) === 'online').length,
      offline: devices.filter(d => normalizeStatus(d.status) === 'offline').length,
      maintenance: devices.filter(d => normalizeStatus(d.status) === 'maintenance').length,
      unknown: devices.filter(d => normalizeStatus(d.status) === 'unknown').length,
    };

    res.status(200).json({
      success: true,
      data: deviceStatuses,
      summary,
      source: "local_database",
      count: devices.length,
    });

  } catch (error) {
    console.error("Error fetching device status:", error);
    return next(new ErrorResponse(`Failed to fetch device status: ${error.message}`, 500));
  }
})
// @desc    Get device status by serial number
// @route   GET /api/devices/status/:serialNumber
// @access  Private
const getDeviceStatusBySerial = asyncHandler(async (req, res, next) => {
  try {
    const { serialNumber } = req.params;
    const { includeDetails = false } = req.query;

    if (!serialNumber) {
      return next(new ErrorResponse("Serial number is required", 400));
    }

    const device = await Device.findOne({ serialNumber })
      .select('name serialNumber type status lastSeen lastStatusCheck batteryLevel signalStrength firmware location')
      .lean();

    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device not found with serial number: ${serialNumber}`,
      });
    }

    // Build response object
    const deviceStatus = {
      serialNumber: device.serialNumber,
      name: device.name,
      type: device.type,
      status: normalizeStatus(device.status),
      lastSeen: device.lastSeen,
      lastStatusCheck: device.lastStatusCheck,
    };

    // Include additional details if requested
    if (includeDetails === 'true') {
      deviceStatus.batteryLevel = device.batteryLevel;
      deviceStatus.signalStrength = device.signalStrength;
      deviceStatus.firmware = device.firmware;
      deviceStatus.location = device.location;
    }

    // Calculate how fresh the status is
    const statusAge = device.lastStatusCheck 
      ? Math.floor((new Date() - new Date(device.lastStatusCheck)) / 1000) 
      : null;

    res.status(200).json({
      success: true,
      data: deviceStatus,
      source: "local_database",
      lastUpdated: device.lastStatusCheck,
      statusAgeSeconds: statusAge,
      message: `Status retrieved from local cache${statusAge ? ` (${statusAge}s old)` : ''}`,
    });

  } catch (error) {
    console.error("Error fetching device status by serial:", error);
    return next(new ErrorResponse(`Failed to fetch device status: ${error.message}`, 500));
  }
});

// @desc    Get all devices status summary
// @route   GET /api/devices/status
// @access  Private
const getAllDevicesStatus = asyncHandler(async (req, res, next) => {
  try {
    const { includeDetails = false, status } = req.query;

    // Build query filter
    const query = {};
    if (status) {
      query.status = normalizeStatus(status);
    }

    const devices = await Device.find(query)
      .select('name serialNumber type status lastSeen lastStatusCheck batteryLevel signalStrength firmware location')
      .lean();

    const deviceStatuses = devices.map(device => {
      const deviceStatus = {
        serialNumber: device.serialNumber,
        name: device.name,
        type: device.type,
        status: normalizeStatus(device.status),
        lastSeen: device.lastSeen,
        lastStatusCheck: device.lastStatusCheck,
      };

      // Include additional details if requested
      if (includeDetails === 'true') {
        deviceStatus.batteryLevel = device.batteryLevel;
        deviceStatus.signalStrength = device.signalStrength;
        deviceStatus.firmware = device.firmware;
        deviceStatus.location = device.location;
      }

      return deviceStatus;
    });

    // Calculate summary statistics
    const summary = {
      total: devices.length,
      online: devices.filter(d => normalizeStatus(d.status) === 'online').length,
      offline: devices.filter(d => normalizeStatus(d.status) === 'offline').length,
      maintenance: devices.filter(d => normalizeStatus(d.status) === 'maintenance').length,
      unknown: devices.filter(d => normalizeStatus(d.status) === 'unknown').length,
    };

    // Calculate average status age
    const statusAges = devices
      .filter(d => d.lastStatusCheck)
      .map(d => Math.floor((new Date() - new Date(d.lastStatusCheck)) / 1000));
    
    const avgStatusAge = statusAges.length > 0 
      ? Math.floor(statusAges.reduce((a, b) => a + b, 0) / statusAges.length)
      : null;

    res.status(200).json({
      success: true,
      data: deviceStatuses,
      summary,
      source: "local_database",
      count: devices.length,
      averageStatusAgeSeconds: avgStatusAge,
      message: "Device statuses retrieved from local cache",
    });

  } catch (error) {
    console.error("Error fetching all devices status:", error);
    return next(new ErrorResponse(`Failed to fetch devices status: ${error.message}`, 500));
  }
});

const getDeviceAnalytics = asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Device analytics functionality not implemented yet",
  })
})

module.exports = {
  createDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  linkDeviceToTank,
  unlinkDeviceFromTank,
  triggerVolumeProcessingForDevice,
  getMyDevices,
  getUnassignedDevices,
  getTankCapableDevices,
  getAllDevicesSensorData,
  getMyDevicesSensorData,
  getLatestSensorDataForDevice, // FIXED: Now properly implemented
  getDeviceHistory,
  getDeviceStats,
  getDeviceStatus,
  getDeviceStatusBySerial,
  getAllDevicesStatus,
  getDeviceAnalytics,
}