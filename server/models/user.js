
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"],
      index: true,
    },
    emailid: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin", "technician"],
        message: "Invalid user role",
      },
      default: "user",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"],
    },
    place: {
      type: String,
      trim: true,
      maxlength: [100, "Place cannot exceed 100 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, "Location cannot exceed 200 characters"],
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      dashboard: {
        theme: { type: String, enum: ["light", "dark"], default: "light" },
        refreshInterval: { type: Number, default: 30 }, // seconds
      },
      alerts: {
        temperature: { type: Boolean, default: true },
        humidity: { type: Boolean, default: true },
        airQuality: { type: Boolean, default: true },
        deviceOffline: { type: Boolean, default: true },
      },
    },
    lastLogin: {
      type: Date,
      index: true,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    // Password reset fields
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    collection: "users",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Compound indexes
userSchema.index({ role: 1, isActive: 1 })
userSchema.index({ lastLogin: -1 })

// Text index for searching
userSchema.index({
  username: "text",
  fullName: "text",
  emailid: "text",
})

// Virtual for assigned devices
userSchema.virtual("devices", {
  ref: "Device",
  localField: "_id",
  foreignField: "assignedToUser",
})

// Virtual for device count
userSchema.virtual("deviceCount", {
  ref: "Device",
  localField: "_id",
  foreignField: "assignedToUser",
  count: true,
})

// Static methods
userSchema.statics.getUserStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        adminUsers: {
          $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
        },
        regularUsers: {
          $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] },
        },
        technicianUsers: {
          $sum: { $cond: [{ $eq: ["$role", "technician"] }, 1, 0] },
        },
        recentLogins: {
          $sum: {
            $cond: [
              {
                $gte: ["$lastLogin", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ])
}

// Instance methods
userSchema.methods.isAdmin = function () {
  return this.role === "admin"
}

userSchema.methods.canAccessDevice = function (deviceId) {
  return this.role === "admin" || this.devices.includes(deviceId)
}

userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date()
  return this.save()
}

// Instance method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next()

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Pre-save middleware for email normalization
userSchema.pre("save", function (next) {
  if (this.emailid) {
    this.emailid = this.emailid.toLowerCase().trim()
  }
  if (this.username) {
    this.username = this.username.trim()
  }
  next()
})

// Pre-remove middleware to handle cleanup
userSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    // Unassign all devices from this user
    await mongoose.model("Device").updateMany({ assignedToUser: this._id }, { $unset: { assignedToUser: 1 } })
    next()
  } catch (error) {
    next(error)
  }
})

module.exports = mongoose.model("User", userSchema)
