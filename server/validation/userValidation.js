const Joi = require("joi")
const mongoose = require("mongoose")

// Custom ObjectId validation
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid")
  }
  return value
}

// Address schema
const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).optional().allow(""),
  city: Joi.string().trim().max(100).optional().allow(""),
  state: Joi.string().trim().max(100).optional().allow(""),
  zipCode: Joi.string().trim().max(20).optional().allow(""),
  country: Joi.string().trim().max(100).optional().allow(""),
})

// Preferences schema
const preferencesSchema = Joi.object({
  theme: Joi.string().valid("light", "dark", "auto").default("light"),
  notifications: Joi.object({
    email: Joi.boolean().default(true),
    push: Joi.boolean().default(true),
    sms: Joi.boolean().default(false),
  }).default(),
  language: Joi.string().min(2).max(5).default("en"),
  timezone: Joi.string().default("UTC"),
})

// Create user schema
const createUserSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      "string.base": "Username must be a string",
      "string.empty": "Username cannot be empty",
      "string.min": "Username must be at least 3 characters long",
      "string.max": "Username cannot exceed 30 characters",
      "string.pattern.base": "Username can only contain letters, numbers, and underscores",
      "any.required": "Username is required",
    }),
  emailid: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.base": "Email must be a string",
      "string.empty": "Email cannot be empty",
      "string.email": "Please provide a valid email address",
      "any.required": "Email address is required",
    }),
  password: Joi.string().min(6).max(128).required().messages({
    "string.base": "Password must be a string",
    "string.empty": "Password cannot be empty",
    "string.min": "Password must be at least 6 characters long",
    "string.max": "Password cannot exceed 128 characters",
    "any.required": "Password is required",
  }),
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Full name must be a string",
    "string.empty": "Full name cannot be empty",
    "string.min": "Full name must be at least 2 characters long",
    "string.max": "Full name cannot exceed 100 characters",
    "any.required": "Full name is required",
  }),
  address: addressSchema.optional(),
  role: Joi.string().valid("user", "admin", "technician").default("user").messages({
    "string.base": "Role must be a string",
    "any.only": "Role must be one of: user, admin, technician",
  }),
  place: Joi.string().trim().max(100).optional().allow("").messages({
    "string.base": "Place must be a string",
    "string.max": "Place cannot exceed 100 characters",
  }),
  location: Joi.string().trim().max(200).optional().allow("").messages({
    "string.base": "Location must be a string",
    "string.max": "Location cannot exceed 200 characters",
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-$$$$]+$/)
    .optional()
    .allow("")
    .messages({
      "string.base": "Phone number must be a string",
      "string.pattern.base": "Please provide a valid phone number",
    }),
  devices: Joi.array()
    .items(
      Joi.string().custom(objectIdValidator, "ObjectId validation").messages({
        "any.invalid": "Device ID must be a valid ObjectId",
        "string.base": "Device ID must be a string",
      }),
    )
    .optional()
    .messages({
      "array.base": "Devices must be an array of device IDs",
    }),
  preferences: preferencesSchema.optional(),
  isActive: Joi.boolean().default(true),
})

// Login validation schema
const loginValidation = Joi.object({
  emailid: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.base": "Email must be a string",
      "string.empty": "Email cannot be empty",
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string().required().messages({
    "string.base": "Password must be a string",
    "string.empty": "Password cannot be empty",
    "any.required": "Password is required",
  }),
})

// Update user schema
const updateUserSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .optional()
    .messages({
      "string.base": "Username must be a string",
      "string.min": "Username must be at least 3 characters long",
      "string.max": "Username cannot exceed 30 characters",
      "string.pattern.base": "Username can only contain letters, numbers, and underscores",
    }),
  emailid: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .messages({
      "string.base": "Email must be a string",
      "string.email": "Please provide a valid email address",
    }),
  password: Joi.string().min(6).max(128).optional().messages({
    "string.base": "Password must be a string",
    "string.min": "Password must be at least 6 characters long",
    "string.max": "Password cannot exceed 128 characters",
  }),
  fullName: Joi.string().trim().min(2).max(100).optional().messages({
    "string.base": "Full name must be a string",
    "string.min": "Full name must be at least 2 characters long",
    "string.max": "Full name cannot exceed 100 characters",
  }),
  address: addressSchema.optional(),
  role: Joi.string().valid("user", "admin", "technician").optional().messages({
    "string.base": "Role must be a string",
    "any.only": "Role must be one of: user, admin, technician",
  }),
  place: Joi.string().trim().max(100).optional().allow("").messages({
    "string.base": "Place must be a string",
    "string.max": "Place cannot exceed 100 characters",
  }),
  location: Joi.string().trim().max(200).optional().allow("").messages({
    "string.base": "Location must be a string",
    "string.max": "Location cannot exceed 200 characters",
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-$$$$]+$/)
    .optional()
    .allow("")
    .messages({
      "string.base": "Phone number must be a string",
      "string.pattern.base": "Please provide a valid phone number",
    }),
  devices: Joi.array()
    .items(
      Joi.string().custom(objectIdValidator, "ObjectId validation").messages({
        "any.invalid": "Device ID must be a valid ObjectId",
        "string.base": "Device ID must be a string",
      }),
    )
    .optional()
    .messages({
      "array.base": "Devices must be an array of device IDs",
    }),
  preferences: preferencesSchema.optional(),
  isActive: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update the user",
  })

// User query schema for filtering
const userQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).optional(),
  role: Joi.string().valid("user", "admin", "technician", "all").optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid("username", "emailid", "fullName", "role", "createdAt", "updatedAt").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
})

// Password change schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.base": "Current password must be a string",
    "string.empty": "Current password cannot be empty",
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string().min(6).max(128).required().messages({
    "string.base": "New password must be a string",
    "string.empty": "New password cannot be empty",
    "string.min": "New password must be at least 6 characters long",
    "string.max": "New password cannot exceed 128 characters",
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "any.only": "Password confirmation does not match new password",
    "any.required": "Password confirmation is required",
  }),
})

module.exports = {
  createUserSchema,
  loginValidation,
  updateUserSchema,
  userQuerySchema,
  changePasswordSchema,
  addressSchema,
  preferencesSchema,
}
