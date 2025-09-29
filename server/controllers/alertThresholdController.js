// backend/controllers/alertThresholdController.js
const AlertThreshold = require("../models/AlertThreshold")
const User = require("../models/user")

// Get all alert thresholds
const getAllThresholds = async (req, res) => {
  try {
    const { isActive, parameter } = req.query

    // Build filter object
    const filter = {}
    if (isActive !== undefined) {
      filter.isActive = isActive === "true"
    }
    if (parameter) {
      filter.parameter = parameter
    }

    const thresholds = await AlertThreshold.find(filter)
      .populate("createdBy", "username emailid")
      .populate("lastUpdatedBy", "username emailid")
      .sort({ parameter: 1 })

    res.status(200).json({
      success: true,
      count: thresholds.length,
      data: thresholds,
    })
  } catch (error) {
    console.error("Error fetching alert thresholds:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch alert thresholds",
      error: error.message,
    })
  }
}

// Get single alert threshold by ID
const getThresholdById = async (req, res) => {
  try {
    const threshold = await AlertThreshold.findById(req.params.id)
      .populate("createdBy", "username emailid")
      .populate("lastUpdatedBy", "username emailid")

    if (!threshold) {
      return res.status(404).json({
        success: false,
        message: "Alert threshold not found",
      })
    }

    res.status(200).json({
      success: true,
      data: threshold,
    })
  } catch (error) {
    console.error("Error fetching alert threshold:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch alert threshold",
      error: error.message,
    })
  }
}

// Create new alert threshold
const createThreshold = async (req, res) => {
  try {
    const { parameter, warningThreshold, criticalThreshold, description, isActive } = req.body

    console.log('=== CREATE THRESHOLD DEBUG ===')
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    console.log('User ID:', req.user?.id)

    // Validate input
    if (!parameter) {
      return res.status(400).json({
        success: false,
        message: "Parameter is required",
      })
    }

    // Check if threshold for this parameter already exists
    const existingThreshold = await AlertThreshold.findOne({ parameter })
    if (existingThreshold) {
      return res.status(400).json({
        success: false,
        message: `Alert threshold for ${parameter} already exists`,
      })
    }

    // Validate that at least one threshold is provided
    if (warningThreshold === null && criticalThreshold === null) {
      return res.status(400).json({
        success: false,
        message: "At least one threshold (warning or critical) must be provided",
      })
    }

    const thresholdData = {
      parameter,
      warningThreshold: warningThreshold !== null ? Number(warningThreshold) : null,
      criticalThreshold: criticalThreshold !== null ? Number(criticalThreshold) : null,
      description: description || "",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user.id,
    }

    console.log('Creating threshold with data:', JSON.stringify(thresholdData, null, 2))

    const threshold = new AlertThreshold(thresholdData)
    await threshold.save()

    // Populate the created threshold
    await threshold.populate("createdBy", "username emailid")

    console.log('Threshold created successfully:', JSON.stringify(threshold, null, 2))

    res.status(201).json({
      success: true,
      message: "Alert threshold created successfully",
      data: threshold,
    })
  } catch (error) {
    console.error("Error creating alert threshold:", error)
    console.log('=== CREATE THRESHOLD ERROR ===')
    console.log('Error name:', error.name)
    console.log('Error message:', error.message)
    console.log('Error stack:', error.stack)

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validationErrors.join(', '),
      })
    }

    res.status(400).json({
      success: false,
      message: "Failed to create alert threshold",
      error: error.message,
    })
  }
}

// Update alert threshold
const updateThreshold = async (req, res) => {
  try {
    const { warningThreshold, criticalThreshold, description, isActive } = req.body

    console.log('=== UPDATE THRESHOLD DEBUG ===')
    console.log('Threshold ID:', req.params.id)
    console.log('Request body:', JSON.stringify(req.body, null, 2))

    const threshold = await AlertThreshold.findById(req.params.id)
    if (!threshold) {
      return res.status(404).json({
        success: false,
        message: "Alert threshold not found",
      })
    }

    // Update fields
    if (warningThreshold !== undefined) {
      threshold.warningThreshold = warningThreshold !== null ? Number(warningThreshold) : null
    }
    if (criticalThreshold !== undefined) {
      threshold.criticalThreshold = criticalThreshold !== null ? Number(criticalThreshold) : null
    }
    if (description !== undefined) {
      threshold.description = description
    }
    if (isActive !== undefined) {
      threshold.isActive = Boolean(isActive)
    }

    threshold.lastUpdatedBy = req.user.id

    console.log('Updated threshold before save:', JSON.stringify(threshold, null, 2))

    await threshold.save()

    // Populate the updated threshold
    await threshold.populate("createdBy", "username emailid")
    await threshold.populate("lastUpdatedBy", "username emailid")

    console.log('Threshold updated successfully')

    res.status(200).json({
      success: true,
      message: "Alert threshold updated successfully",
      data: threshold,
    })
  } catch (error) {
    console.error("Error updating alert threshold:", error)
    console.log('=== UPDATE THRESHOLD ERROR ===')
    console.log('Error name:', error.name)
    console.log('Error message:', error.message)

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validationErrors.join(', '),
      })
    }

    res.status(400).json({
      success: false,
      message: "Failed to update alert threshold",
      error: error.message,
    })
  }
}

// Delete alert threshold
const deleteThreshold = async (req, res) => {
  try {
    const threshold = await AlertThreshold.findById(req.params.id)
    if (!threshold) {
      return res.status(404).json({
        success: false,
        message: "Alert threshold not found",
      })
    }

    await AlertThreshold.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: "Alert threshold deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting alert threshold:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete alert threshold",
      error: error.message,
    })
  }
}

// Initialize default thresholds
const initializeDefaultThresholds = async (req, res) => {
  try {
    const existingCount = await AlertThreshold.countDocuments()
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Alert thresholds already exist. Cannot initialize defaults.",
      })
    }

    const defaultThresholds = AlertThreshold.getDefaultThresholds()
    const thresholdsWithCreator = defaultThresholds.map((threshold) => ({
      ...threshold,
      createdBy: req.user.id,
    }))

    const createdThresholds = await AlertThreshold.insertMany(thresholdsWithCreator)

    res.status(201).json({
      success: true,
      message: "Default alert thresholds initialized successfully",
      count: createdThresholds.length,
      data: createdThresholds,
    })
  } catch (error) {
    console.error("Error initializing default thresholds:", error)
    res.status(500).json({
      success: false,
      message: "Failed to initialize default thresholds",
      error: error.message,
    })
  }
}

// Get threshold statistics
const getThresholdStats = async (req, res) => {
  try {
    const totalThresholds = await AlertThreshold.countDocuments()
    const activeThresholds = await AlertThreshold.countDocuments({ isActive: true })
    const inactiveThresholds = totalThresholds - activeThresholds

    // Get configured vs unconfigured thresholds
    const configuredThresholds = await AlertThreshold.countDocuments({
      $or: [
        { warningThreshold: { $ne: null } },
        { criticalThreshold: { $ne: null } }
      ]
    })

    res.status(200).json({
      success: true,
      data: {
        total: totalThresholds,
        active: activeThresholds,
        inactive: inactiveThresholds,
        configured: configuredThresholds,
        unconfigured: totalThresholds - configuredThresholds,
      },
    })
  } catch (error) {
    console.error("Error fetching threshold statistics:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch threshold statistics",
      error: error.message,
    })
  }
}

module.exports = {
  getAllThresholds,
  getThresholdById,
  createThreshold,
  updateThreshold,
  deleteThreshold,
  initializeDefaultThresholds,
  getThresholdStats,
}