const mongoose = require("mongoose");
const moment = require("moment");
const { getModels } = require("../utils/modelHelpers");
const ErrorResponse = require("../utils/errorResponse");
const errorCodes = require("../utils/errorCodes");

// Helper function to validate ObjectId (if not already in modelHelpers)
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);


/**
 * @desc Record a manual volume adjustment
 * @route POST /api/volume-history
 * @access Private (Admin, Editor, or User with tank access)
 */
const createManualVolumeAdjustment = async (req, res, next) => {
    const {
        tankId,
        volumeLiters,
        volumeM3,
        actualLevel,
        fillPercentage,
        eventType,
        changeAmount,
        notes,
        timestamp,
        rawSensorReading,
    } = req.body;

    console.log(`\n📝 [VolumeHistoryController] ===== MANUAL ENTRY REQUEST =====`);
    console.log(`[VolumeHistoryController] User: ${req.user.username}`);
    console.log(`[VolumeHistoryController] Tank ID: ${tankId}`);
    console.log(`[VolumeHistoryController] Volume: ${volumeLiters}L`);
    console.log(`[VolumeHistoryController] Raw Reading: ${rawSensorReading}`);

    // Basic validation
    if (!tankId || volumeLiters === undefined || !eventType) {
        return next(new ErrorResponse("Please provide tankId, volumeLiters, and eventType", 400, errorCodes.VALIDATION_ERROR));
    }

    if (!isValidObjectId(tankId)) {
        return next(new ErrorResponse("Invalid tank ID format", 400, errorCodes.VALIDATION_ERROR));
    }

    // Validate required field for TankVolumeHistory
    if (rawSensorReading === undefined || rawSensorReading === null) {
        return next(new ErrorResponse("rawSensorReading is required for volume history records", 400, errorCodes.VALIDATION_ERROR));
    }

    const { TankType, Device, TankVolumeHistory } = getModels();

    const tank = await TankType.findById(tankId).populate("device");
    if (!tank) {
        return next(new ErrorResponse(`Tank not found with ID ${tankId}`, 404, errorCodes.NOT_FOUND));
    }

    console.log(`[VolumeHistoryController] Tank found: ${tank.name}`);

    // Authorization check (already handled in routes, but good to have a fallback/double-check)
    if (req.user.role !== "admin") {
        const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id");
        const deviceIds = userDevices.map((d) => d._id);

        if (!tank.device || !deviceIds.some((id) => id.toString() === tank.device._id.toString())) {
            return next(new ErrorResponse("Not authorized to modify this tank", 403, errorCodes.INSUFFICIENT_PERMISSIONS));
        }
    }

    // Calculate volumeM3 if not provided
    const calculatedVolumeM3 = volumeM3 || volumeLiters / 1000;

    // Calculate fillPercentage if not provided
    const calculatedFillPercentage =
        fillPercentage !== undefined ? fillPercentage : tank.capacity > 0 ? (volumeLiters / tank.capacity) * 100 : 0;

    // Create tank snapshot for historical accuracy
    const tankSnapshot = {
        name: tank.name,
        shape: tank.shape,
        orientation: tank.orientation,
        dimensions: tank.dimensions,
        capacity: tank.capacity,
        offsetDepth: tank.offsetDepth,
        deadSpaceVolume: tank.deadSpaceVolume || 0,
        materialType: tank.materialType,
        alertThresholds: tank.alertThresholds,
        deviceType: tank.deviceType,
        bulkDensity: tank.bulkDensity,
    };

    const deviceInfo = tank.device || null;
    const deviceId = deviceInfo ? deviceInfo._id : null;
    const deviceSerialNumber = deviceInfo ? deviceInfo.serialNumber : "MANUAL_ENTRY";

    console.log(`[VolumeHistoryController] Device info:`, {
        deviceId,
        deviceSerialNumber,
        deviceName: deviceInfo?.name,
    });

    const newEntry = await TankVolumeHistory.create({
        tankId: tankId,
        deviceId: deviceId,
        deviceSerialNumber: deviceSerialNumber,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        rawSensorReading: Number(rawSensorReading),
        actualLevel: actualLevel || 0,
        volumeLiters: Number(volumeLiters),
        volumeM3: Number(calculatedVolumeM3),
        fillPercentage: Number(calculatedFillPercentage),
        tankSnapshot: tankSnapshot,
        dataQuality: "manual", // Mark manual entries
        qualityScore: 100, // Manual entries are high quality
        processingInfo: {
            ...processingInfo,
            processedBy: req.user._id,
            processedAt: new Date(),
            processingVersion: "2.5",
            calculationMethod: "manual_entry",
            sensorType: "manual",
        },
        errors: [], // Manual entries typically have no errors
        source: "manual_adjustment",
    });

    // Update the tank's current volume and fill percentage
    tank.currentVolumeLiters = volumeLiters;
    tank.currentFillPercentage = calculatedFillPercentage;
    tank.lastUpdated = new Date();
    await tank.save();

    console.log(`[VolumeHistoryController] ✅ Manual entry created: ${newEntry._id}`);
    console.log(`[VolumeHistoryController] Tank updated with current volume: ${volumeLiters}L`);

    res.status(201).json({
        success: true,
        data: newEntry,
        message: "Manual volume adjustment recorded successfully",
    });
};

/**
 * @desc Get tank volume history
 * @route GET /api/volume-history/:tankId
 * @access Private
 */
const getTankVolumeHistory = async (req, res, next) => {
    const { tankId } = req.params;
    const { startDate, endDate, limit = 100, quality } = req.query;

    console.log(`\n📊 [VolumeHistoryController] ===== FETCHING HISTORY =====`);
    console.log(`[VolumeHistoryController] Tank ID: ${tankId}`);
    console.log(`[VolumeHistoryController] User: ${req.user.username}`);
    console.log(`[VolumeHistoryController] Limit: ${limit}`);

    if (!isValidObjectId(tankId)) {
        return next(new ErrorResponse("Invalid tank ID format", 400, errorCodes.VALIDATION_ERROR));
    }

    const { TankType, Device, TankVolumeHistory } = getModels();

    const tank = await TankType.findById(tankId).populate("device");
    if (!tank) {
        return next(new ErrorResponse(`Tank not found with ID ${tankId}`, 404, errorCodes.NOT_FOUND));
    }

    console.log(`[VolumeHistoryController] Tank found: ${tank.name}`);

    // Authorization check
    if (req.user.role !== "admin") {
        const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id");
        const deviceIds = userDevices.map((d) => d._id);

        if (!tank.device || !deviceIds.some((id) => id.toString() === tank.device._id.toString())) {
            return next(new ErrorResponse("Not authorized to view history for this tank", 403, errorCodes.INSUFFICIENT_PERMISSIONS));
        }
    }

    const query = { tankId: tankId };

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (quality) {
        query.dataQuality = quality;
    }

    console.log(`[VolumeHistoryController] Query:`, query);

    const history = await TankVolumeHistory.find(query)
        .populate("device", "name serialNumber type")
        .sort({ timestamp: -1 })
        .limit(Number.parseInt(limit))
        .lean();

    console.log(`[VolumeHistoryController] ✅ Found ${history.length} records`);

    res.status(200).json({
        success: true,
        data: history,
        count: history.length,
        tank: {
            id: tank._id,
            name: tank.name,
            capacity: tank.capacity,
            currentVolume: tank.currentVolumeLiters || 0,
            currentFillPercentage: tank.currentFillPercentage || 0,
        },
        message: "Tank volume history fetched successfully",
    });
};

/**
 * @desc Get aggregated tank volume statistics
 * @route GET /api/volume-history/:tankId/summary
 * @access Private
 */
const getTankVolumeSummary = async (req, res, next) => {
    const { tankId } = req.params;
    const { timeRange = "24h" } = req.query;

    console.log(`\n📈 [VolumeHistoryController] ===== FETCHING SUMMARY =====`);
    console.log(`[VolumeHistoryController] Tank ID: ${tankId}`);
    console.log(`[VolumeHistoryController] Time Range: ${timeRange}`);

    if (!isValidObjectId(tankId)) {
        return next(new ErrorResponse("Invalid tank ID format", 400, errorCodes.VALIDATION_ERROR));
    }

    const { TankType, Device, TankVolumeHistory } = getModels();

    const tank = await TankType.findById(tankId).populate("device");
    if (!tank) {
        return next(new ErrorResponse(`Tank not found with ID ${tankId}`, 404, errorCodes.NOT_FOUND));
    }

    // Authorization check
    if (req.user.role !== "admin") {
        const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id");
        const deviceIds = userDevices.map((d) => d._id);

        if (!tank.device || !deviceIds.some((id) => id.toString() === tank.device._id.toString())) {
            return next(new ErrorResponse("Not authorized to view summary for this tank", 403, errorCodes.INSUFFICIENT_PERMISSIONS));
        }
    }

    let startTime;
    const now = new Date();

    switch (timeRange) {
        case "24h":
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case "7d":
            startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case "30d":
            startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case "90d":
            startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        default:
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    console.log(`[VolumeHistoryController] Aggregating from ${startTime.toISOString()} to ${now.toISOString()}`);

    const aggregationPipeline = [
        {
            $match: {
                tankId: new mongoose.Types.ObjectId(tankId),
                timestamp: { $gte: startTime, $lte: now },
                dataQuality: { $in: ["excellent", "good", "fair", "manual"] },
            },
        },
        {
            $sort: { timestamp: 1 },
        },
        {
            $group: {
                _id: null,
                firstVolume: { $first: "$volumeLiters" },
                lastVolume: { $last: "$volumeLiters" },
                count: { $sum: 1 },
                avgVolumeLiters: { $avg: "$volumeLiters" },
                minVolumeLiters: { $min: "$volumeLiters" },
                maxVolumeLiters: { $max: "$volumeLiters" },
                avgFillPercentage: { $avg: "$fillPercentage" },
                minFillPercentage: { $min: "$fillPercentage" },
                maxFillPercentage: { $max: "$fillPercentage" },
                avgActualLevel: { $avg: "$actualLevel" },
                avgQualityScore: { $avg: "$qualityScore" },
            },
        },
        {
            $project: {
                _id: 0,
                avgVolumeLiters: { $round: ["$avgVolumeLiters", 2] },
                minVolumeLiters: { $round: ["$minVolumeLiters", 2] },
                maxVolumeLiters: { $round: ["$maxVolumeLiters", 2] },
                avgFillPercentage: { $round: ["$avgFillPercentage", 2] },
                minFillPercentage: { $round: ["$minFillPercentage", 2] },
                maxFillPercentage: { $round: ["$maxFillPercentage", 2] },
                avgActualLevel: { $round: ["$avgActualLevel", 3] },
                avgQualityScore: { $round: ["$avgQualityScore", 1] },
                count: 1,
                netChange: { $round: [{ $subtract: ["$lastVolume", "$firstVolume"] }, 2] },
            },
        },
    ];

    const stats = await TankVolumeHistory.aggregate(aggregationPipeline);

    console.log(`[VolumeHistoryController] Aggregation result:`, stats);

    if (!stats || stats.length === 0) {
        console.log(`[VolumeHistoryController] ⚠️ No data found for aggregation`);
        return res.status(200).json({
            success: true,
            data: {
                avgVolumeLiters: 0,
                minVolumeLiters: 0,
                maxVolumeLiters: 0,
                avgFillPercentage: 0,
                minFillPercentage: 0,
                maxFillPercentage: 0,
                avgActualLevel: 0,
                avgQualityScore: 0,
                count: 0,
                netChange: 0,
            },
            tank: {
                id: tank._id,
                name: tank.name,
                capacity: tank.capacity,
            },
            message: "No volume data available for the selected period",
        });
    }

    console.log(`[VolumeHistoryController] ✅ Summary generated successfully`);

    res.status(200).json({
        success: true,
        data: stats[0],
        tank: {
            id: tank._id,
            name: tank.name,
            capacity: tank.capacity,
            currentVolume: tank.currentVolumeLiters || 0,
            currentFillPercentage: tank.currentFillPercentage || 0,
        },
        message: "Tank volume statistics fetched successfully",
    });
};

/**
 * @desc Get latest volume reading for a tank
 * @route GET /api/volume-history/:tankId/latest
 * @access Private
 */
const getLatestVolumeReading = async (req, res, next) => {
    const { tankId } = req.params;

    console.log(`\n🔍 [VolumeHistoryController] ===== FETCHING LATEST =====`);
    console.log(`[VolumeHistoryController] Tank ID: ${tankId}`);

    if (!isValidObjectId(tankId)) {
        return next(new ErrorResponse("Invalid tank ID format", 400, errorCodes.VALIDATION_ERROR));
    }

    const { TankType, Device, TankVolumeHistory } = getModels();

    const tank = await TankType.findById(tankId).populate("device");
    if (!tank) {
        return next(new ErrorResponse(`Tank not found with ID ${tankId}`, 404, errorCodes.NOT_FOUND));
    }

    // Authorization check
    if (req.user.role !== "admin") {
        const userDevices = await Device.find({ assignedToUser: req.user._id }).select("_id");
        const deviceIds = userDevices.map((d) => d._id);

        if (!tank.device || !deviceIds.some((id) => id.toString() === tank.device._id.toString())) {
            return next(new ErrorResponse("Not authorized to view this tank", 403, errorCodes.INSUFFICIENT_PERMISSIONS));
        }
    }

    const latestReading = await TankVolumeHistory.findOne({ tankId })
        .populate("device", "name serialNumber type")
        .sort({ timestamp: -1 })
        .lean();

    console.log(`[VolumeHistoryController] Latest reading:`, latestReading ? "Found" : "Not found");

    res.status(200).json({
        success: true,
        data: latestReading,
        tank: {
            id: tank._id,
            name: tank.name,
            capacity: tank.capacity,
            currentVolume: tank.currentVolumeLiters || 0,
            currentFillPercentage: tank.currentFillPercentage || 0,
        },
        message: latestReading ? "Latest volume reading fetched successfully" : "No volume readings found",
    });
};

/**
 * @desc Delete volume history record
 * @route DELETE /api/volume-history/:id
 * @access Private (Admin only)
 */
const deleteVolumeHistoryRecord = async (req, res, next) => {
    const { id } = req.params;

    console.log(`\n🗑️ [VolumeHistoryController] ===== DELETING RECORD =====`);
    console.log(`[VolumeHistoryController] Record ID: ${id}`);
    console.log(`[VolumeHistoryController] User: ${req.user.username}`);

    if (!isValidObjectId(id)) {
        return next(new ErrorResponse("Invalid record ID format", 400, errorCodes.VALIDATION_ERROR));
    }

    const { TankVolumeHistory } = getModels();

    const record = await TankVolumeHistory.findById(id);
    if (!record) {
        return next(new ErrorResponse(`Volume history record not found with ID ${id}`, 404, errorCodes.NOT_FOUND));
    }

    await TankVolumeHistory.findByIdAndDelete(id);

    console.log(`[VolumeHistoryController] ✅ Record deleted: ${id}`);

    res.status(200).json({
        success: true,
        message: "Volume history record deleted successfully",
        deletedId: id,
    });
};

module.exports = {
    createManualVolumeAdjustment,
    getTankVolumeHistory,
    getTankVolumeSummary,
    getLatestVolumeReading,
    deleteVolumeHistoryRecord,
};
