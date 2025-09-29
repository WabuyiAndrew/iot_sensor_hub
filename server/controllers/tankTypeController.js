const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");
const errorCodes = require("../utils/errorCodes");

// ✅ ENHANCED: Import volume processor for tank volume operations
const { processTankVolumeReading, getLatestTankVolume, getTankVolumeHistory } = require("../services/volumeProcessor");

// Helper function to safely get models (only when needed)
function getModels() {
  try {
    return {
      TankType: mongoose.model("TankType"),
      Device: mongoose.model("Device"),
      User: mongoose.model("User"),
      TankVolumeHistory: mongoose.model("TankVolumeHistory"),
      SensorData: mongoose.model("SensorData"),
    };
  } catch (error) {
    console.error("❌ [TankType Controller] Error accessing models:", error.message);
    throw new Error("Database models not available");
  }
}

// ✅ ENHANCED: Helper function to validate tank dimensions based on shape
function validateTankDimensions(shape, dimensions) {
  const errors = [];

  if (!dimensions || typeof dimensions !== "object") {
    errors.push("Tank dimensions object is required");
    return errors;
  }

  const isInvalid = (value) => {
    return value === undefined || value === null || isNaN(Number(value)) || Number(value) <= 0;
  };

  switch (shape?.toLowerCase()) {
    case "cylindrical":
      if (isInvalid(dimensions.diameter) && isInvalid(dimensions.radius)) {
        errors.push("Cylindrical tanks require diameter or radius");
      }
      if (isInvalid(dimensions.height) && isInvalid(dimensions.totalHeight)) {
        errors.push("Cylindrical tanks require height");
      }
      break;

    case "rectangular":
      if (isInvalid(dimensions.length)) errors.push("Rectangular tanks require length");
      if (isInvalid(dimensions.width)) errors.push("Rectangular tanks require width");
      if (isInvalid(dimensions.height)) errors.push("Rectangular tanks require height");
      break;

    case "spherical":
      if (isInvalid(dimensions.radius) && isInvalid(dimensions.diameter)) {
        errors.push("Spherical tanks require radius or diameter");
      }
      break;

    case "silo":
      if (isInvalid(dimensions.diameter)) errors.push("Silo tanks require diameter");
      if (isInvalid(dimensions.totalHeight)) errors.push("Silo tanks require total height");
      break;

    default:
      // Allow other shapes
      break;
  }

  return errors;
}

// ✅ ENHANCED: Helper function to calculate theoretical tank capacity
function calculateTheoreticalCapacity(shape, dimensions) {
  try {
    if (!dimensions || typeof dimensions !== "object") {
      console.warn(`[Theoretical Capacity] Invalid dimensions:`, dimensions);
      return null;
    }

    const PI = Math.PI;

    switch (shape?.toLowerCase()) {
      case "cylindrical":
        let radius = null;
        let height = null;

        if (dimensions.radius && !isNaN(dimensions.radius)) {
          radius = Number(dimensions.radius);
        } else if (dimensions.diameter && !isNaN(dimensions.diameter)) {
          radius = Number(dimensions.diameter) / 2; // ✅ FIX: Proper radius calculation
        }

        if (dimensions.height && !isNaN(dimensions.height)) {
          height = Number(dimensions.height);
        } else if (dimensions.totalHeight && !isNaN(dimensions.totalHeight)) {
          height = Number(dimensions.totalHeight);
        }

        if (radius > 0 && height > 0) {
          return Math.round(PI * radius * radius * height * 1000); // Convert m³ to liters
        }
        break;

      case "rectangular":
        if (dimensions.length && dimensions.width && dimensions.height) {
          return Math.round(dimensions.length * dimensions.width * dimensions.height * 1000);
        }
        break;

      case "spherical":
        const sphereRadius = dimensions.radius || dimensions.diameter / 2;
        if (sphereRadius) {
          return Math.round((4 / 3) * PI * sphereRadius * sphereRadius * sphereRadius * 1000);
        }
        break;

      default:
        // For other shapes, return null
        break;
    }

    return null;
  } catch (error) {
    console.error("Error calculating theoretical capacity:", error);
    return null;
  }
}

// ✅ CRITICAL FIX: Enhanced volume recalculation function - NOW SYNCHRONOUS
async function recalculateVolumeAfterDimensionUpdate(tankId, updatedDimensions) {
  const requestId = `recalc-${Date.now()}`;
  console.log(`\n🔄 [${requestId}] ===== STARTING VOLUME RECALCULATION =====`);
  console.log(`[${requestId}] Tank ID: ${tankId}`);
  console.log(`[${requestId}] Updated Dimensions:`, JSON.stringify(updatedDimensions, null, 2));

  try {
    const { TankType, Device, SensorData } = getModels();

    // Get the updated tank with its device
    const tank = await TankType.findById(tankId).populate("device");
    if (!tank) {
      console.warn(`❌ [${requestId}] Tank not found: ${tankId}`);
      return { success: false, message: "Tank not found" };
    }

    console.log(`[${requestId}] ✅ Tank found: ${tank.name}`);
    console.log(`[${requestId}] Tank shape: ${tank.shape}`);
    console.log(`[${requestId}] Current dimensions:`, JSON.stringify(tank.dimensions, null, 2));

    if (!tank.device) {
      console.warn(`⚠️ [${requestId}] Tank has no device assigned, setting volume to 0`);
      await TankType.findByIdAndUpdate(tankId, {
        $set: {
          currentVolumeLiters: 0,
          currentFillPercentage: 0,
          lastVolumeUpdate: new Date(),
        },
      });
      return { success: true, message: "Volume reset to 0 (no device assigned)" };
    }

    console.log(`[${requestId}] Device found: ${tank.device.name} (${tank.device.serialNumber})`);

    // Get the latest sensor reading
    const latestSensorData = await SensorData.findOne({
      deviceId: tank.device._id,
    }).sort({ timestamp: -1 });

    if (!latestSensorData) {
      console.warn(`⚠️ [${requestId}] No sensor data found, setting volume to 0`);
      await TankType.findByIdAndUpdate(tankId, {
        $set: {
          currentVolumeLiters: 0,
          currentFillPercentage: 0,
          lastVolumeUpdate: new Date(),
        },
      });
      return { success: true, message: "Volume reset to 0 (no sensor data)" };
    }

    console.log(`[${requestId}] ✅ Latest sensor data found:`);
    console.log(`[${requestId}] - Timestamp: ${latestSensorData.timestamp}`);
    console.log(`[${requestId}] - Ultrasonic level: ${latestSensorData.ultrasonic_liquid_level}m`);
    console.log(`[${requestId}] - Raw level: ${latestSensorData.liquid_level_raw}m`);

    // Use the most appropriate sensor reading
    const sensorReading =
      latestSensorData.ultrasonic_liquid_level || latestSensorData.liquid_level_raw || latestSensorData.level || 0;

    console.log(`[${requestId}] Using sensor reading: ${sensorReading}m`);

    // ✅ CRITICAL FIX: Pass the correct arguments as full objects
    // The `processTankVolumeReading` function signature is:
    // async function processTankVolumeReading(tank, rawReading, sensorData, device)
    console.log(`[${requestId}] 🔄 Calling volume processor...`);
    const volumeResult = await processTankVolumeReading(tank, sensorReading, latestSensorData, tank.device);

    console.log(`[${requestId}] ✅ Volume processor result:`, volumeResult);

    if (volumeResult.success) {
      console.log(`[${requestId}] ✅ Volume recalculated successfully:`);
      console.log(`[${requestId}] - New Volume: ${volumeResult.volumeLiters}L`);
      console.log(`[${requestId}] - New Fill %: ${volumeResult.fillPercentage.toFixed(2)}%`);
      console.log(`[${requestId}] - Data Quality: ${volumeResult.dataQuality}`);

      await TankType.findByIdAndUpdate(tankId, {
        $set: {
          currentVolumeLiters: volumeResult.volumeLiters,
          currentFillPercentage: volumeResult.fillPercentage,
          effectiveLiquidHeight: volumeResult.effectiveLiquidHeight,
          lastVolumeUpdate: new Date(),
        },
      });
      return {
        success: true,
        message: "Volume recalculated successfully",
        volumeLiters: volumeResult.volumeLiters,
        fillPercentage: volumeResult.fillPercentage,
        dataQuality: volumeResult.dataQuality,
        timestamp: volumeResult.timestamp,
      };
    } else {
      console.error(`❌ [${requestId}] Volume processor failed: ${volumeResult.message}`);
      return { success: false, message: volumeResult.message };
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error in volume recalculation:`, error);
    return { success: false, message: error.message };
  }
}

// ✅ CRITICAL FIX: Enhanced updateTankType function - NOW SYNCHRONOUS VOLUME RECALCULATION
const updateTankType = async (req, res, next) => {
  const requestId = `update-tank-${Date.now()}`;

  try {
    const { TankType, Device } = getModels();

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tank ID format",
      });
    }

    console.log(`\n🔧 [${requestId}] ===== UPDATING TANK =====`);
    console.log(`[${requestId}] Tank ID: ${id}`);
    console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));

    const tankType = await TankType.findById(id);
    if (!tankType) {
      return res.status(404).json({
        success: false,
        message: "Tank not found",
      });
    }

    console.log(`[${requestId}] Current tank: ${tankType.name}`);
    console.log(`[${requestId}] Current dimensions:`, JSON.stringify(tankType.dimensions, null, 2));

    const {
      name,
      description,
      shape,
      orientation,
      materialType,
      dimensions,
      capacity,
      offsetDepth,
      location,
      bulkDensity,
      deviceType,
      alertThresholds,
      device,
      isActive,
    } = req.body;

    // ✅ ENHANCED: Check what's being updated with detailed logging
    const isDimensionsUpdated = dimensions && Object.keys(dimensions).length > 0;
    const isShapeUpdated = shape && shape !== tankType.shape;
    const isCapacityUpdated = capacity && capacity !== tankType.capacity;
    const isOffsetUpdated = offsetDepth !== undefined && offsetDepth !== tankType.offsetDepth;

    console.log(`[${requestId}] Update flags:`);
    console.log(`[${requestId}] - Dimensions updated: ${isDimensionsUpdated}`);
    console.log(`[${requestId}] - Shape updated: ${isShapeUpdated} (${tankType.shape} -> ${shape})`);
    console.log(`[${requestId}] - Capacity updated: ${isCapacityUpdated} (${tankType.capacity} -> ${capacity})`);
    console.log(`[${requestId}] - Offset updated: ${isOffsetUpdated} (${tankType.offsetDepth} -> ${offsetDepth})`);

    if (isDimensionsUpdated) {
      console.log(`[${requestId}] New dimensions:`, JSON.stringify(dimensions, null, 2));
    }

    // Flag to trigger volume recalculation
    const needsVolumeRecalculation = isDimensionsUpdated || isShapeUpdated || isCapacityUpdated || isOffsetUpdated;

    if (needsVolumeRecalculation) {
      console.log(`🔄 [${requestId}] VOLUME RECALCULATION NEEDED!`);
    } else {
      console.log(`[${requestId}] No volume recalculation needed`);
    }

    // Validate dimensions if being changed
    if (isDimensionsUpdated || isShapeUpdated) {
      const targetShape = shape || tankType.shape;
      const targetDimensions = isDimensionsUpdated
        ? { ...tankType.dimensions.toObject(), ...dimensions }
        : tankType.dimensions;

      const dimensionErrors = validateTankDimensions(targetShape, targetDimensions);
      if (dimensionErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Dimension validation failed: ${dimensionErrors.join(", ")}`,
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || "";
    if (shape !== undefined) updateData.shape = shape;
    if (orientation !== undefined) updateData.orientation = orientation;
    if (materialType !== undefined) updateData.materialType = materialType;
    if (capacity !== undefined) updateData.capacity = Number(capacity);
    if (offsetDepth !== undefined) updateData.offsetDepth = offsetDepth ? Number(offsetDepth) : 0;
    if (location !== undefined) updateData.location = location?.trim() || "";
    if (bulkDensity !== undefined) updateData.bulkDensity = bulkDensity ? Number(bulkDensity) : null;
    if (deviceType !== undefined) updateData.deviceType = deviceType || null;
    if (alertThresholds !== undefined) {
      updateData.alertThresholds = {
        low: alertThresholds.low ? Number(alertThresholds.low) : 20,
        high: alertThresholds.high ? Number(alertThresholds.high) : 80,
        critical: alertThresholds.critical ? Number(alertThresholds.critical) : 95,
      };
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    // ✅ CRITICAL: Handle dimensions update properly
    if (dimensions !== undefined) {
      const newDimensions = { ...tankType.dimensions.toObject() };

      // Update only the provided dimension fields
      for (const key in dimensions) {
        if (dimensions[key] === "" || dimensions[key] === null) {
          newDimensions[key] = null;
        } else if (!isNaN(Number(dimensions[key]))) {
          newDimensions[key] = Number(dimensions[key]);
        }
      }

      updateData.dimensions = newDimensions;
      console.log(`[${requestId}] Final dimensions for update:`, JSON.stringify(newDimensions, null, 2));
    }

    // Handle device assignment (existing logic)
    const oldDeviceId = tankType.device ? tankType.device.toString() : null;
    const newDeviceId = device ? String(device) : null;

    if (oldDeviceId !== newDeviceId) {
      if (oldDeviceId && !newDeviceId) {
        await Device.findByIdAndUpdate(oldDeviceId, { $set: { tankType: null } });
        updateData.device = null;
        console.log(`[${requestId}] Unassigned device ${oldDeviceId}`);
      } else if (newDeviceId) {
        if (!mongoose.Types.ObjectId.isValid(newDeviceId)) {
          return res.status(400).json({ success: false, message: "Invalid device ID format." });
        }

        const newAssignedDevice = await Device.findById(newDeviceId);
        if (!newAssignedDevice) {
          return res.status(400).json({ success: false, message: `Device not found.` });
        }

        if (newAssignedDevice.tankType && newAssignedDevice.tankType.toString() !== id) {
          return res.status(400).json({
            success: false,
            message: `Device is already assigned to another tank.`,
          });
        }

        if (oldDeviceId && oldDeviceId !== newDeviceId) {
          await Device.findByIdAndUpdate(oldDeviceId, { $set: { tankType: null } });
        }

        await Device.findByIdAndUpdate(newDeviceId, { tankType: tankType._id });
        updateData.device = new mongoose.Types.ObjectId(newDeviceId);
        console.log(`[${requestId}] Assigned device ${newDeviceId}`);
      }
    }

    console.log(`[${requestId}] 💾 Updating tank in database...`);

    // ✅ CRITICAL: Update the tank document
    const updatedTankType = await TankType.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    })
      .populate("device", "name serialNumber type manufacturer model")
      .populate("createdBy", "username fullName")
      .lean();

    console.log(`[${requestId}] ✅ Tank updated in database`);
    console.log(`[${requestId}] Updated dimensions:`, JSON.stringify(updatedTankType.dimensions, null, 2));

    // 🔄 CRITICAL FIX: SYNCHRONOUS VOLUME RECALCULATION
    let volumeRecalcResult = null;
    if (needsVolumeRecalculation || oldDeviceId !== newDeviceId) { // Also trigger on device change
      console.log(`🔄 [${requestId}] ===== STARTING SYNCHRONOUS VOLUME RECALCULATION =====`);
      console.log(`🔄 [${requestId}] Tank ID: ${id}`);
      console.log(`🔄 [${requestId}] Updated dimensions:`, JSON.stringify(updateData.dimensions, null, 2));

      // ✅ CRITICAL: DO THIS SYNCHRONOUSLY, NOT IN BACKGROUND
      volumeRecalcResult = await recalculateVolumeAfterDimensionUpdate(id, updateData.dimensions);

      console.log(`🔄 [${requestId}] Volume recalculation result:`, volumeRecalcResult);

      if (volumeRecalcResult.success) {
        console.log(`✅ [${requestId}] Volume recalculated successfully`);
        console.log(`✅ [${requestId}] New volume: ${volumeRecalcResult.volumeLiters}L`);
        console.log(`✅ [${requestId}] New fill %: ${volumeRecalcResult.fillPercentage}%`);

        // Refresh the tank data to get updated volume
        const refreshedTank = await TankType.findById(id)
          .populate("device", "name serialNumber type manufacturer model")
          .populate("createdBy", "username fullName")
          .lean();

        if (refreshedTank) {
          console.log(`🔄 [${requestId}] Refreshed tank volume: ${refreshedTank.currentVolumeLiters}L`);
          console.log(`🔄 [${requestId}] Refreshed tank fill %: ${refreshedTank.currentFillPercentage}%`);

          Object.assign(updatedTankType, {
            currentVolumeLiters: refreshedTank.currentVolumeLiters,
            currentFillPercentage: refreshedTank.currentFillPercentage,
            effectiveLiquidHeight: refreshedTank.effectiveLiquidHeight, // Ensure this is also updated
            lastVolumeUpdate: refreshedTank.lastVolumeUpdate,
          });
        }
      } else {
        console.warn(`⚠️ [${requestId}] Volume recalculation failed: ${volumeRecalcResult.message}`);
      }

      console.log(`🔄 [${requestId}] ===== VOLUME RECALCULATION COMPLETE =====`);
    }

    // ✅ ENHANCED: Add computed fields
    const enhancedTankType = {
      ...updatedTankType,
      status: updatedTankType.isActive ? "active" : "inactive",
      currentVolume: updatedTankType.currentVolumeLiters || 0,
      fillPercentage: updatedTankType.currentFillPercentage || 0,
      theoreticalCapacity: calculateTheoreticalCapacity(updatedTankType.shape, updatedTankType.dimensions),
      volumeRecalculated: needsVolumeRecalculation,
      volumeRecalcResult: volumeRecalcResult,
    };

    console.log(`[${requestId}] ✅ Tank update complete: ${updatedTankType.name}`);
    console.log(`[${requestId}] Final response volume: ${enhancedTankType.currentVolume}L`);
    console.log(`[${requestId}] Final response fill %: ${enhancedTankType.fillPercentage}%`);

    res.status(200).json({
      success: true,
      message: needsVolumeRecalculation
        ? "Tank updated and volume recalculated successfully"
        : "Tank updated successfully",
      data: enhancedTankType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error updating tank: ${error.message}`);
    console.error(`❌ [${requestId}] Stack trace:`, error.stack);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    next(error);
  }
};

// ✅ NEW: Manual volume recalculation endpoint for testing
const manualVolumeRecalculation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestId = `manual-recalc-${Date.now()}`;

    console.log(`\n🔧 [${requestId}] ===== MANUAL VOLUME RECALCULATION =====`);
    console.log(`[${requestId}] Tank ID: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tank ID format",
      });
    }

    // ✅ FIX: The recalculateVolumeAfterDimensionUpdate function now correctly retrieves tank data internally,
    // so we don't need to pass dimensions here.
    const result = await recalculateVolumeAfterDimensionUpdate(id);

    res.status(200).json({
      success: true,
      message: "Manual volume recalculation completed",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Manual volume recalculation error:", error);
    next(error);
  }
};

// Create tank type
const createTankType = async (req, res, next) => {
  try {
    const { TankType, Device } = getModels();

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const {
      name,
      description,
      shape,
      orientation,
      materialType,
      dimensions,
      capacity,
      offsetDepth,
      location,
      bulkDensity,
      deviceType,
      alertThresholds,
      device,
    } = req.body;

    // Validate required fields
    if (!name || !shape || !dimensions || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Name, shape, dimensions, and capacity are required",
      });
    }

    // Validate dimensions for the shape
    const dimensionErrors = validateTankDimensions(shape, dimensions);
    if (dimensionErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Dimension validation failed: ${dimensionErrors.join(", ")}`,
      });
    }

    // Check for duplicate name
    const existingTank = await TankType.findOne({ name: name.trim() });
    if (existingTank) {
      return res.status(400).json({
        success: false,
        message: "Tank with this name already exists",
      });
    }

    // Handle device assignment
    let assignedDevice = null;
    if (device) {
      if (!mongoose.Types.ObjectId.isValid(device)) {
        return res.status(400).json({
          success: false,
          message: "Invalid device ID format",
        });
      }

      assignedDevice = await Device.findById(device);
      if (!assignedDevice) {
        return res.status(400).json({
          success: false,
          message: "Device not found",
        });
      }

      if (assignedDevice.tankType) {
        return res.status(400).json({
          success: false,
          message: "Device is already assigned to another tank",
        });
      }
    }

    // Create tank
    const tankData = {
      name: name.trim(),
      description: description?.trim() || "",
      shape,
      orientation: orientation || "vertical",
      materialType: materialType || "liquid",
      dimensions,
      capacity: Number(capacity),
      offsetDepth: offsetDepth ? Number(offsetDepth) : 0,
      location: location?.trim() || "",
      bulkDensity: bulkDensity ? Number(bulkDensity) : null,
      deviceType: deviceType || null,
      alertThresholds: {
        low: alertThresholds?.low ? Number(alertThresholds.low) : 20,
        high: alertThresholds?.high ? Number(alertThresholds.high) : 80,
        critical: alertThresholds?.critical ? Number(alertThresholds.critical) : 95,
      },
      device: assignedDevice ? assignedDevice._id : null,
      createdBy: req.user._id,
      isActive: true,
    };

    const newTankType = await TankType.create(tankData);

    // Update device if assigned
    if (assignedDevice) {
      await Device.findByIdAndUpdate(assignedDevice._id, { tankType: newTankType._id });
    }

    const populatedTank = await TankType.findById(newTankType._id)
      .populate("device", "name serialNumber type manufacturer model")
      .populate("createdBy", "username fullName")
      .lean();

    const enhancedTankType = {
      ...populatedTank,
      status: "active",
      currentVolume: 0,
      currentFillPercentage: 0,
      theoreticalCapacity: calculateTheoreticalCapacity(populatedTank.shape, populatedTank.dimensions),
    };

    res.status(201).json({
      success: true,
      message: "Tank created successfully",
      data: enhancedTankType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error creating tank:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    next(error);
  }
};

// ✅ FIXED: Get all tank types with manual pagination
const getAllTankTypes = async (req, res, next) => {
  try {
    const { TankType } = getModels();

    const {
      page = 1,
      limit = 50,
      search,
      shape,
      materialType,
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    console.log(`[TankTypeController] Fetching tanks with query:`, {
      page,
      limit,
      search,
      shape,
      materialType,
      isActive,
      sortBy,
      sortOrder,
    });

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    if (shape) query.shape = shape;
    if (materialType) query.materialType = materialType;
    if (isActive !== undefined) query.isActive = isActive === "true";

    // ✅ CRITICAL FIX: Enhanced role-based filtering for users
    if (req.user.role === "user") {
      // Find tanks that either:
      // 1. Were created by the user, OR
      // 2. Have devices assigned to the user
      const { Device } = getModels();

      // Get all devices assigned to this user
      const userDevices = await Device.find({
        assignedToUser: req.user._id,
        tankType: { $ne: null } // Only devices that are assigned to tanks
      }).select('tankType').lean();

      const tankIdsFromUserDevices = userDevices.map(device => device.tankType);

      console.log(`[TankTypeController] User ${req.user._id} has devices assigned to tanks:`, tankIdsFromUserDevices);

      // Query for tanks created by user OR tanks with user's devices
      query.$or = [
        { createdBy: req.user._id }, // Tanks created by user
        { _id: { $in: tankIdsFromUserDevices } } // Tanks with user's devices
      ];

      console.log(`[TankTypeController] Enhanced user query:`, JSON.stringify(query, null, 2));
    }

    console.log(`[TankTypeController] Final query:`, JSON.stringify(query, null, 2));

    // ✅ FIXED: Manual pagination instead of using paginate plugin
    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get total count
    const totalDocs = await TankType.countDocuments(query);
    const totalPages = Math.ceil(totalDocs / limitNum);

    // Get tanks
    const tanks = await TankType.find(query)
      .populate("device", "name serialNumber type manufacturer model status assignedToUser")
      .populate("createdBy", "username fullName")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log(`[TankTypeController] Found ${tanks.length} tanks for user role: ${req.user.role}`);

    // Enhance tank data
    const enhancedTanks = tanks.map((tank) => ({
      ...tank,
      status: tank.isActive ? "active" : "inactive",
      currentVolume: tank.currentVolumeLiters || 0,
      fillPercentage: tank.currentFillPercentage || 0,
      theoreticalCapacity: calculateTheoreticalCapacity(tank.shape, tank.dimensions),
    }));

    res.status(200).json({
      success: true,
      data: enhancedTanks,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalDocs: totalDocs,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching tanks:", error);
    next(error);
  }
};

// Get tank type by ID
const getTankTypeById = async (req, res, next) => {
  try {
    const { TankType, Device } = getModels();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tank ID format",
      });
    }

    const tankType = await TankType.findById(id)
      .populate("device", "name serialNumber type manufacturer model status assignedToUser")
      .populate("createdBy", "username fullName")
      .lean();

    if (!tankType) {
      return res.status(404).json({
        success: false,
        message: "Tank not found",
      });
    }

    // ✅ ENHANCED: Role-based access control - users can access tanks with their devices
    if (req.user.role === "user") {
      const userCanAccess =
        tankType.createdBy._id.toString() === req.user._id.toString() ||
        (tankType.device && tankType.device.assignedToUser && tankType.device.assignedToUser.toString() === req.user._id.toString());

      if (!userCanAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view tanks you created or tanks with your assigned devices.",
        });
      }
    }

    const enhancedTankType = {
      ...tankType,
      status: tankType.isActive ? "active" : "inactive",
      currentVolume: tankType.currentVolumeLiters || 0,
      fillPercentage: tankType.currentFillPercentage || 0,
      theoreticalCapacity: calculateTheoreticalCapacity(tankType.shape, tankType.dimensions),
    };

    res.status(200).json({
      success: true,
      data: enhancedTankType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching tank:", error);
    next(error);
  }
};

// Delete tank type
const deleteTankType = async (req, res, next) => {
  try {
    const { TankType, Device } = getModels();

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tank ID format",
      });
    }

    const tankType = await TankType.findById(id);
    if (!tankType) {
      return res.status(404).json({
        success: false,
        message: "Tank not found",
      });
    }

    // Unassign device if assigned
    if (tankType.device) {
      await Device.findByIdAndUpdate(tankType.device, { $set: { tankType: null } });
    }

    await TankType.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Tank deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error deleting tank:", error);
    next(error);
  }
};

// ✅ CRITICAL FIX: Get user accessible tanks - now includes tanks with user's devices
const getUserAccessibleTanks = async (req, res, next) => {
  try {
    const { TankType, Device } = getModels();

    console.log(`[getUserAccessibleTanks] Checking tank access for user: ${req.user._id} (${req.user.role})`);

    // For admin users, return all active tanks
    if (req.user.role === "admin") {
      const tanks = await TankType.find({ isActive: true })
        .populate("device", "name serialNumber type status assignedToUser")
        .select("name shape materialType currentVolumeLiters currentFillPercentage capacity location device")
        .lean();

      const enhancedTanks = tanks.map((tank) => ({
        ...tank,
        currentVolume: tank.currentVolumeLiters || 0,
        fillPercentage: tank.currentFillPercentage || 0,
      }));

      console.log(`[getUserAccessibleTanks] Admin access: returning ${enhancedTanks.length} tanks`);

      return res.status(200).json({
        success: true,
        data: enhancedTanks,
        count: enhancedTanks.length,
        hasAccess: enhancedTanks.length > 0,
        accessType: "admin",
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ CRITICAL FIX: For regular users, find tanks created by them OR tanks with devices assigned to them
    const { User } = getModels();
    const userId = req.user._id;

    // Find devices assigned to the current user that are linked to tanks
    const userDevices = await Device.find({
      assignedToUser: userId,
      tankType: { $ne: null } // Only devices that are actually linked to a tank
    }).select('tankType').lean();

    const tankIdsFromUserDevices = userDevices.map(device => device.tankType);

    // Find tanks created by the user OR tanks linked to their devices
    const query = {
      isActive: true, // Only active tanks
      $or: [
        { createdBy: userId },
        { _id: { $in: tankIdsFromUserDevices } }
      ]
    };

    console.log(`[getUserAccessibleTanks] User query for accessible tanks:`, JSON.stringify(query, null, 2));

    const tanks = await TankType.find(query)
      .populate("device", "name serialNumber type status assignedToUser")
      .select("name shape materialType currentVolumeLiters currentFillPercentage capacity location device")
      .lean();

    const enhancedTanks = tanks.map((tank) => ({
      ...tank,
      currentVolume: tank.currentVolumeLiters || 0,
      fillPercentage: tank.currentFillPercentage || 0,
    }));

    console.log(`[getUserAccessibleTanks] User access: returning ${enhancedTanks.length} tanks`);

    res.status(200).json({
      success: true,
      data: enhancedTanks,
      count: enhancedTanks.length,
      hasAccess: enhancedTanks.length > 0,
      accessType: "user",
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Error fetching user accessible tanks:", error);
    next(error);
  }
};

// ✅ NEW: Manual volume recalculation endpoint for testing
const triggerVolumeProcessingForTank = async (req, res, next) => {
  try {
    const { id } = req.params; // tankId
    const requestId = `trigger-tank-volume-${Date.now()}`;

    console.log(`\n🔧 [${requestId}] ===== MANUAL VOLUME PROCESSING TRIGGERED FOR TANK =====`);
    console.log(`[${requestId}] Tank ID: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tank ID format",
      });
    }

    const { TankType, Device, SensorData } = getModels();

    const tank = await TankType.findById(id).populate("device");

    if (!tank) {
      console.warn(`❌ [${requestId}] Tank not found: ${id}`);
      return res.status(404).json({ success: false, message: "Tank not found" });
    }

    // Authorization check: User must be admin OR assigned to the device linked to this tank
    if (req.user.role !== "admin") {
      const isAuthorized = tank.device && tank.device.assignedToUser && tank.device.assignedToUser.toString() === req.user._id.toString();
      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: "Not authorized to trigger volume processing for this tank." });
      }
    }

    if (!tank.device) {
      console.warn(`⚠️ [${requestId}] Tank has no device assigned, cannot process volume.`);
      return res.status(400).json({ success: false, message: "Tank has no device assigned to process volume." });
    }

    const latestSensorData = await SensorData.findOne({ deviceId: tank.device._id }).sort({ timestamp: -1 });

    if (!latestSensorData) {
      console.warn(`⚠️ [${requestId}] No sensor data found for device ${tank.device.serialNumber}, cannot process volume.`);
      return res.status(400).json({ success: false, message: "No recent sensor data found for the assigned device." });
    }

    const sensorReading = latestSensorData.ultrasonic_liquid_level || latestSensorData.liquid_level_raw || latestSensorData.level || 0;

    console.log(`[${requestId}] Calling volume processor with latest reading: ${sensorReading}m`);
    const volumeResult = await processTankVolumeReading(tank, sensorReading, latestSensorData, tank.device);

    if (volumeResult.success) {
      console.log(`✅ [${requestId}] Volume processing successful for tank ${id}: ${volumeResult.volumeLiters}L`);
      res.status(200).json({
        success: true,
        message: "Volume processing triggered and updated successfully",
        data: volumeResult,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error(`❌ [${requestId}] Volume processing failed for tank ${id}: ${volumeResult.message}`);
      res.status(500).json({
        success: false,
        message: `Volume processing failed: ${volumeResult.message}`,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error(`❌ [${requestId}] Error in triggerVolumeProcessingForTank:`, error);
    next(error);
  }
};

// ✅ NEW: Endpoint to get tank volume history for a specific tank
const getTankVolumeHistoryEndpoint = async (req, res, next) => {
  try {
    const { id } = req.params; // tankId
    const { startDate, endDate, limit = 500 } = req.query; // Add query parameters for filtering
    const requestId = `tank-vol-hist-${Date.now()}`;

    console.log(`\n📊 [${requestId}] ===== TANK VOLUME HISTORY ENDPOINT REQUEST =====`);
    console.log(`[${requestId}] Tank ID: ${id}`);
    console.log(`[${requestId}] Query params:`, { startDate, endDate, limit });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tank ID format",
      });
    }

    const { TankType, Device } = getModels();

    const tank = await TankType.findById(id).populate("device");

    if (!tank) {
      console.warn(`❌ [${requestId}] Tank not found: ${id}`);
      return res.status(404).json({ success: false, message: "Tank not found" });
    }

    // Authorization check: User must be admin OR assigned to the device linked to this tank
    if (req.user.role !== "admin") {
      const isAuthorized = tank.device && tank.device.assignedToUser && tank.device.assignedToUser.toString() === req.user._id.toString();
      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: "Not authorized to view volume history for this tank." });
      }
    }

    // Call the service function to get history
    const historyData = await getTankVolumeHistory(id, startDate, endDate, parseInt(limit));

    res.status(200).json({
      success: true,
      data: historyData,
      count: historyData.length,
      message: "Tank volume history retrieved successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching tank volume history:", error);
    next(error);
  }
};


module.exports = {
  createTankType,
  getAllTankTypes, // Renamed from getTankTypes for clarity
  getTankTypeById,
  updateTankType,
  deleteTankType,
  getUserAccessibleTanks,
  manualVolumeRecalculation, // Export the new manual recalculation function
  triggerVolumeProcessingForTank, // Export the new manual trigger for tank volume
  getTankVolumeHistoryEndpoint, // Export the new endpoint for tank volume history
  getLatestTankVolumeEndpoint: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid tank ID format" });
      }
      const latestVolume = await getLatestTankVolume(id);
      if (!latestVolume) {
        return res.status(404).json({ success: false, message: "No volume data found for this tank" });
      }
      res.status(200).json({ success: true, message: "Latest tank volume retrieved successfully", data: latestVolume, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("❌ Error fetching latest tank volume:", error);
      next(error);
    }
  },
  recalculateVolumeAfterDimensionUpdate // Export for internal use if needed by other controllers/services
};
