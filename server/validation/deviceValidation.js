
const Joi = require("joi")
const mongoose = require("mongoose")

// Custom ObjectId validation
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid")
  }
  return value
}

// Parameter schema for device configuration (kept as is, as per your instruction)
const parameterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required().messages({
    "string.base": "Parameter name must be a string",
    "string.empty": "Parameter name cannot be empty",
    "string.min": "Parameter name cannot be empty",
    "string.max": "Parameter name cannot exceed 50 characters",
    "any.required": "Parameter name is required",
  }),
  unit: Joi.string().trim().max(20).optional().allow("").messages({
    "string.base": "Parameter unit must be a string",
    "string.max": "Parameter unit cannot exceed 20 characters",
  }),
  dataType: Joi.string().valid("number", "string", "boolean").default("number").messages({
    "any.only": "Data type must be one of: number, string, boolean",
  }),
  threshold: Joi.object({
    min: Joi.number().optional().allow(null),
    max: Joi.number().optional().allow(null),
  }).optional(),
  isActive: Joi.boolean().default(true),
})

// GPS coordinates schema (kept as is)
const gpsCoordinatesSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).optional().allow(null, "").messages({
    "number.base": "Latitude must be a number",
    "number.min": "Latitude must be between -90 and 90 degrees",
    "number.max": "Latitude must be between -90 and 90 degrees",
  }),
  longitude: Joi.number().min(-180).max(180).optional().allow(null, "").messages({
    "number.base": "Longitude must be a number",
    "number.min": "Longitude must be between -180 and 180 degrees",
    "number.max": "Longitude must be between -180 and 180 degrees",
  }),
}).optional()

// UPDATED: Device types enum to match the Device Mongoose model
const deviceTypes = [
  "air_quality",
  "weather",
  "liquid_level", // Legacy support for general liquid level.
  "multi_sensor", // Legacy support for multi-purpose sensors.
  "generic",
  // Specific real sensor types for tank monitoring
  "ultrasonic_level_sensor",
  "radar_level_sensor",
  "pressure_transmitter",
  "submersible_level_sensor",
  "float_switch",
  "capacitive_level_sensor",
  "guided_wave_radar",
  "laser_level_sensor",
  "vibrating_fork",
  "load_cell", // For weight-based measurement.
  "Other" // Keep 'Other' for flexibility if needed
]

// Device status enum (kept as is)
const deviceStatuses = ["online", "offline", "maintenance", "error", "calibrating"] // Added 'calibrating' from Device model

// Create device schema
const createDeviceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Device name must be a string",
    "string.empty": "Device name cannot be empty",
    "string.min": "Device name must be at least 2 characters long",
    "string.max": "Device name cannot exceed 100 characters",
    "any.required": "Device name is required",
  }),
  serialNumber: Joi.string().trim().min(3).max(50).required().messages({
    "string.base": "Serial number must be a string",
    "string.empty": "Serial number cannot be empty",
    "string.min": "Serial number must be at least 3 characters long",
    "string.max": "Serial number cannot exceed 50 characters",
    "any.required": "Serial number is required",
  }),
  type: Joi.string()
    .trim()
    .valid(...deviceTypes)
    .required()
    .messages({
      "string.base": "Device type must be a string",
      "string.empty": "Device type cannot be empty",
      "any.required": "Device type is required",
      "any.only": `Device type must be one of: ${deviceTypes.join(", ")}`,
    }),
  location: Joi.string().trim().max(200).optional().allow("").messages({
    "string.base": "Location must be a string",
    "string.max": "Location cannot exceed 200 characters",
  }),
  gpsCoordinates: gpsCoordinatesSchema,
  status: Joi.string()
    .valid(...deviceStatuses)
    .default("offline")
    .messages({
      "any.only": `Status must be one of: ${deviceStatuses.join(", ")}`,
    }),
  // Parameters field is an array of parameterSchema objects
  parameters: Joi.array().items(parameterSchema).optional().messages({
    "array.base": "Parameters must be an array",
  }),
  assignedToUser: Joi.string().custom(objectIdValidator, "ObjectId validation").allow(null, "").optional().messages({
    "any.invalid": "Assigned user ID must be a valid ObjectId",
    "string.base": "Assigned user ID must be a string",
  }),
  // tankType is a single ObjectId reference, allowing null for unassigned devices
  tankType: Joi.string().custom(objectIdValidator, "ObjectId validation").allow(null, "").optional().messages({
    "any.invalid": "Tank type ID must be a valid ObjectId",
    "string.base": "Tank type ID must be a string",
  }),
  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "isActive must be a boolean",
  }),
  firmware: Joi.object({
    version: Joi.string().default("1.0.0"),
    lastUpdate: Joi.date().default(Date.now),
  }).optional(),
  // Added manufacturer and model fields from Device schema
  manufacturer: Joi.string().trim().max(100).optional().allow("").messages({
    "string.base": "Manufacturer must be a string",
    "string.max": "Manufacturer cannot exceed 100 characters",
  }),
  model: Joi.string().trim().max(100).optional().allow("").messages({
    "string.base": "Model must be a string",
    "string.max": "Model cannot exceed 100 characters",
  }),
  // Added specifications and installation fields from Device schema
  specifications: Joi.object({
    minRange: Joi.number().optional().allow(null),
    maxRange: Joi.number().optional().allow(null),
    accuracy: Joi.string().optional().allow(""),
    resolution: Joi.string().optional().allow(""),
    temperatureRange: Joi.object({
      min: Joi.number().optional().allow(null),
      max: Joi.number().optional().allow(null),
    }).optional(),
    pressureRating: Joi.number().optional().allow(null),
    outputType: Joi.string().valid("4-20mA", "0-10V", "digital", "modbus", "hart", "profibus", "ethernet").optional().allow(""),
    processConnection: Joi.string().optional().allow(""),
    materialConstruction: Joi.string().optional().allow(""),
    ipRating: Joi.string().optional().allow(""),
    frequency: Joi.number().optional().allow(null),
    beamAngle: Joi.number().optional().allow(null),
    deadBand: Joi.number().optional().allow(null),
    diaphragmMaterial: Joi.string().optional().allow(""),
    fillFluid: Joi.string().optional().allow(""),
    certifications: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  installation: Joi.object({
    installationHeight: Joi.number().optional().allow(null),
    mountingType: Joi.string().valid("top_mounted", "side_mounted", "bottom_mounted", "remote_seal").optional().allow(""),
    calibrationDate: Joi.date().optional().allow(null),
    calibrationOffset: Joi.number().default(0).optional().allow(null),
    scalingLow: Joi.number().optional().allow(null),
    scalingHigh: Joi.number().optional().allow(null),
  }).optional(),
  // Added lastSeen, lastMaintenance, installationDate, maintenanceSchedule, notes from Device schema
  lastSeen: Joi.date().optional().allow(null),
  lastMaintenance: Joi.date().optional().allow(null),
  installationDate: Joi.date().default(Date.now).optional().allow(null),
  maintenanceSchedule: Joi.object({
    lastMaintenance: Joi.date().optional().allow(null),
    nextMaintenance: Joi.date().optional().allow(null),
    maintenanceInterval: Joi.number().optional().allow(null),
  }).optional(),
  notes: Joi.string().trim().max(500).optional().allow("").messages({
    "string.base": "Notes must be a string",
    "string.max": "Notes cannot exceed 500 characters",
  }),
})

// Update device schema
const updateDeviceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    "string.base": "Device name must be a string",
    "string.empty": "Device name cannot be empty",
    "string.min": "Device name must be at least 2 characters long",
    "string.max": "Device name cannot exceed 100 characters",
  }),
  serialNumber: Joi.string().trim().min(3).max(50).optional().messages({
    "string.base": "Serial number must be a string",
    "string.empty": "Serial number cannot be empty",
    "string.min": "Serial number must be at least 3 characters long",
    "string.max": "Serial number cannot exceed 50 characters",
  }),
  type: Joi.string()
    .trim()
    .valid(...deviceTypes)
    .optional()
    .messages({
      "string.base": "Device type must be a string",
      "string.empty": "Device type cannot be empty",
      "any.only": `Device type must be one of: ${deviceTypes.join(", ")}`,
    }),
  location: Joi.string().trim().max(200).optional().allow("").messages({
    "string.base": "Location must be a string",
    "string.max": "Location cannot exceed 200 characters",
  }),
  gpsCoordinates: gpsCoordinatesSchema,
  status: Joi.string()
    .valid(...deviceStatuses)
    .optional()
    .messages({
      "any.only": `Status must be one of: ${deviceStatuses.join(", ")}`,
    }),
  parameters: Joi.array().items(parameterSchema).optional().messages({
    "array.base": "Parameters must be an array",
  }),
  assignedToUser: Joi.string().custom(objectIdValidator, "ObjectId validation").allow(null, "").optional().messages({
    "any.invalid": "Assigned user ID must be a valid ObjectId",
    "string.base": "Assigned user ID must be a string",
  }),
  tankType: Joi.string().custom(objectIdValidator, "ObjectId validation").allow(null, "").optional().messages({
    "any.invalid": "Tank type ID must be a valid ObjectId",
    "string.base": "Tank type ID must be a string",
  }),
  isActive: Joi.boolean().optional().messages({
    "boolean.base": "isActive must be a boolean",
  }),
  firmware: Joi.object({
    version: Joi.string().optional(),
    lastUpdate: Joi.date().optional(),
  }).optional(),
  // Added manufacturer and model fields from Device schema
  manufacturer: Joi.string().trim().max(100).optional().allow("").messages({
    "string.base": "Manufacturer must be a string",
    "string.max": "Manufacturer cannot exceed 100 characters",
  }),
  model: Joi.string().trim().max(100).optional().allow("").messages({
    "string.base": "Model must be a string",
    "string.max": "Model cannot exceed 100 characters",
  }),
  // Added specifications and installation fields from Device schema
  specifications: Joi.object({
    minRange: Joi.number().optional().allow(null),
    maxRange: Joi.number().optional().allow(null),
    accuracy: Joi.string().optional().allow(""),
    resolution: Joi.string().optional().allow(""),
    temperatureRange: Joi.object({
      min: Joi.number().optional().allow(null),
      max: Joi.number().optional().allow(null),
    }).optional(),
    pressureRating: Joi.number().optional().allow(null),
    outputType: Joi.string().valid("4-20mA", "0-10V", "digital", "modbus", "hart", "profibus", "ethernet").optional().allow(""),
    processConnection: Joi.string().optional().allow(""),
    materialConstruction: Joi.string().optional().allow(""),
    ipRating: Joi.string().optional().allow(""),
    frequency: Joi.number().optional().allow(null),
    beamAngle: Joi.number().optional().allow(null),
    deadBand: Joi.number().optional().allow(null),
    diaphragmMaterial: Joi.string().optional().allow(""),
    fillFluid: Joi.string().optional().allow(""),
    certifications: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  installation: Joi.object({
    installationHeight: Joi.number().optional().allow(null),
    mountingType: Joi.string().valid("top_mounted", "side_mounted", "bottom_mounted", "remote_seal").optional().allow(""),
    calibrationDate: Joi.date().optional().allow(null),
    calibrationOffset: Joi.number().default(0).optional().allow(null),
    scalingLow: Joi.number().optional().allow(null),
    scalingHigh: Joi.number().optional().allow(null),
  }).optional(),
  // Added lastSeen, lastMaintenance, installationDate, maintenanceSchedule, notes from Device schema
  lastSeen: Joi.date().optional().allow(null),
  lastMaintenance: Joi.date().optional().allow(null),
  installationDate: Joi.date().optional().allow(null), // Changed default to not be here, as it's optional for update
  maintenanceSchedule: Joi.object({
    lastMaintenance: Joi.date().optional().allow(null),
    nextMaintenance: Joi.date().optional().allow(null),
    maintenanceInterval: Joi.number().optional().allow(null),
  }).optional(),
  notes: Joi.string().trim().max(500).optional().allow("").messages({
    "string.base": "Notes must be a string",
    "string.max": "Notes cannot exceed 500 characters",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update the device",
  })

// Device query schema for filtering
const deviceQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).optional(),
  type: Joi.string()
    .valid(...deviceTypes, "all")
    .optional(),
  status: Joi.string()
    .valid(...deviceStatuses, "all")
    .optional(),
  assignedToUser: Joi.string().custom(objectIdValidator, "ObjectId validation").allow(null, "").optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid("name", "serialNumber", "type", "createdAt", "updatedAt").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  // Added manufacturer, model, and tankCompatible for query schema
  manufacturer: Joi.string().trim().max(100).optional(),
  model: Joi.string().trim().max(100).optional(),
  tankCompatible: Joi.boolean().optional(), // For filtering tank-capable devices
})

module.exports = {
  createDeviceSchema,
  updateDeviceSchema,
  deviceQuerySchema,
  parameterSchema,
  gpsCoordinatesSchema,
}

