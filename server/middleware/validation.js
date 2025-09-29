const Joi = require("joi");
const mongoose = require("mongoose");
const { ErrorResponse } = require("../utils/errorResponse"); // ✅ Correctly destructured

// Custom ObjectId validation
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

// Parameter schema for device configuration
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
});

// GPS coordinates schema
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
}).optional();

// Device types and statuses
const deviceTypes = ["Weather Station", "Air Quality Monitor", "Water Level Sensor", "Temperature Sensor", "Other"];
const deviceStatuses = ["online", "offline", "maintenance", "error"];

// Create device schema
const createDeviceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  serialNumber: Joi.string().trim().min(3).max(50).required(),
  type: Joi.string().trim().valid(...deviceTypes).required(),
  location: Joi.string().trim().max(200).optional().allow(""),
  gpsCoordinates: gpsCoordinatesSchema,
  status: Joi.string().valid(...deviceStatuses).default("offline"),
  parameters: Joi.array().items(parameterSchema).optional(),
  assignedToUser: Joi.string().custom(objectIdValidator).allow(null, "").optional(),
  tankType: Joi.string().custom(objectIdValidator).allow(null, "").optional(),
  isActive: Joi.boolean().default(true),
  firmware: Joi.object({
    version: Joi.string().default("1.0.0"),
    lastUpdate: Joi.date().default(Date.now),
  }).optional(),
});

// Update device schema
const updateDeviceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  serialNumber: Joi.string().trim().min(3).max(50).optional(),
  type: Joi.string().trim().valid(...deviceTypes).optional(),
  location: Joi.string().trim().max(200).optional().allow(""),
  gpsCoordinates: gpsCoordinatesSchema,
  status: Joi.string().valid(...deviceStatuses).optional(),
  parameters: Joi.array().items(parameterSchema).optional(),
  assignedToUser: Joi.string().custom(objectIdValidator).allow(null, "").optional(),
  tankType: Joi.string().custom(objectIdValidator).allow(null, "").optional(),
  isActive: Joi.boolean().optional(),
  firmware: Joi.object({
    version: Joi.string().optional(),
    lastUpdate: Joi.date().optional(),
  }).optional(),
}).min(1);

// Device query schema
const deviceQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).optional(),
  type: Joi.string().valid(...deviceTypes, "all").optional(),
  status: Joi.string().valid(...deviceStatuses, "all").optional(),
  assignedToUser: Joi.string().custom(objectIdValidator).allow(null, "").optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid("name", "serialNumber", "type", "createdAt", "updatedAt").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

// Middleware for Joi validation
const validate = (schema, property) => (req, res, next) => {
  const { error } = schema.validate(req[property], { abortEarly: false, allowUnknown: true });
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return next(new ErrorResponse(`Validation error: ${errors.join(", ")}`, 400)); // ✅ Works now
  }
  next();
};

// Export everything
module.exports = {
  createDeviceSchema,
  updateDeviceSchema,
  deviceQuerySchema,
  parameterSchema,
  gpsCoordinatesSchema,
  validateDevice: validate(createDeviceSchema, "body"),
  validateDeviceUpdate: validate(updateDeviceSchema, "body"),
  validateObjectId:
    (paramName = "id") =>
    (req, res, next) => {
      const { error } = Joi.string().custom(objectIdValidator).validate(req.params[paramName]);
      if (error) {
        return next(new ErrorResponse(`Invalid ID format for ${paramName}`, 400));
      }
      next();
    },
};
