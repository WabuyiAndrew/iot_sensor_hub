console.log("📝 [UserController] Loading user controller functions...")
const User = require("../models/user") // Ensure this path is correct
const Device = require("../models/Device") // Added for device assignment logic, ensure this path is correct
const bcrypt = require("bcryptjs")
const { createSecretToken } = require("../middleware/AuthMiddleware") // Ensure this path is correct
const { ErrorResponse } = require("../utils/errorResponse") // Ensure this path is correct
const mongoose = require("mongoose") // Import mongoose to use ObjectId.isValid
const crypto = require("crypto")
const nodemailer = require("nodemailer")
const asyncHandler = require("../middleware/asyncHandler"); // Import asyncHandler

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/**
 * @desc Create a new user
 * @route POST /api/users
 * @access Private/Admin
 */
const createUser = asyncHandler(async (req, res, next) => {
  try {
    const {
      username,
      emailid,
      password,
      fullName,
      role,
      address,
      phone,
      place,
      location,
      devices,
    } = req.body
    console.log(`[UserController] Creating user: ${username} | Request ID: ${req.requestId}`)
    console.log("[UserController] Received devices for creation:", devices)

    const existingUser = await User.findOne({
      $or: [{ emailid }, { username }],
    })
    if (existingUser) {
      const field = existingUser.emailid === emailid ? "email" : "username"
      return next(new ErrorResponse(`User with this ${field} already exists`, 400))
    }

    const user = await User.create({
      username,
      emailid,
      password,
      fullName,
      role: role || "user",
      address: address || {},
      phone,
      place,
      location,
      isActive: true,
    })

    if (devices && Array.isArray(devices) && devices.length > 0) {
      const validDeviceIds = devices.filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      if (validDeviceIds.length > 0) {
        await Device.updateMany(
          { _id: { $in: validDeviceIds } },
          { $set: { assignedToUser: user._id } },
        )
        console.log(`[UserController] Assigned ${validDeviceIds.length} devices to new user ${user.username}.`)
      }
    }

    const populatedUser = await User.findById(user._id)
      .select("-password -loginAttempts -lockUntil")
      .populate("devices", "name serialNumber status")
      .lean()

    console.log(`✅ [UserController] User created successfully: ${user.username} | Request ID: ${req.requestId}`)

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: populatedUser,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ [UserController] Error creating user: ${error.message} | Request ID: ${req.requestId}`)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message)
      return next(new ErrorResponse(messages.join(", "), 400))
    }
    next(error)
  }
});

/**
 * @desc Login user
 * @route POST /api/users/login
 * @access Public
 */
// const loginUser = asyncHandler(async (req, res, next) => {
//   try {
//     const { emailid, password, rememberMe } = req.body
//     console.log(`[UserController] Login attempt for: ${emailid} | Request ID: ${req.requestId}`)
//     console.log(`[UserController] Request body received:`, {
//       emailid: emailid ? "provided" : "missing",
//       password: password ? "provided" : "missing",
//       rememberMe: rememberMe ? "true" : "false",
//     })
//     if (!emailid || !password) {
//       console.log(`❌ [UserController] Missing credentials | Request ID: ${req.requestId}`)
//       return next(new ErrorResponse("Please provide email and password", 400))
//     }
//     const user = await User.findOne({ emailid }).select("+password +loginAttempts +lockUntil")
//     if (!user) {
//       console.log(`❌ [UserController] User not found: ${emailid} | Request ID: ${req.requestId}`)
//       return next(new ErrorResponse("Invalid credentials", 401))
//     }
//     if (!user.isActive) {
//       console.log(`❌ [UserController] Inactive user login attempt: ${emailid} | Request ID: ${req.requestId}`)
//       return next(new ErrorResponse("Account is inactive. Please contact administrator.", 403))
//     }
//     if (user.lockUntil && user.lockUntil > Date.now()) {
//       console.log(`❌ [UserController] Locked account login attempt: ${emailid} | Request ID: ${req.requestId}`)
//       const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60))
//       return next(new ErrorResponse(`Account is locked. Try again in ${lockTimeRemaining} minutes.`, 423))
//     }
//     const isPasswordValid = await user.matchPassword(password)
//     if (!isPasswordValid) {
//       console.log(`❌ [UserController] Invalid password for: ${emailid} | Request ID: ${req.requestId}`)
//       const updates = { $inc: { loginAttempts: 1 } }
//       if (user.loginAttempts + 1 >= 5) {
//         updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }
//         console.warn(
//           `⚠️ [UserController] Account locked due to failed attempts: ${emailid} | Request ID: ${req.requestId}`,
//         )
//       }
//       await User.findByIdAndUpdate(user._id, updates)
//       return next(new ErrorResponse("Invalid credentials", 401))
//     }
//     if (user.loginAttempts > 0) {
//       await User.findByIdAndUpdate(user._id, {
//         $unset: { loginAttempts: 1, lockUntil: 1 },
//         $set: { lastLogin: new Date() },
//       })
//     } else {
//       await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })
//     }
//     const tokenExpiration = rememberMe ? "30d" : "24h"
//     const token = createSecretToken(user._id, { role: user.role }, tokenExpiration)

//     // --- CRITICAL FIX START ---
//     // The "SameSite" attribute is set to "Lax" to prevent token errors in
//     // development environments that are not running over HTTPS.
//     // In production, you should use `secure: true` and `sameSite: 'None'`.
//     const cookieOptions = {
//       httpOnly: true,
//       expires: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)),
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "Lax",
//       path: "/",
//     };

//     res.cookie("token", token, cookieOptions);
//     // --- CRITICAL FIX END ---

//     console.log(`✅ [UserController] User logged in successfully: ${user.username} | Request ID: ${req.requestId}`)
//     const response = {
//       success: true,
//       message: "Login successful",
//       user: {
//         _id: user._id,
//         username: user.username,
//         emailid: user.emailid,
//         fullName: user.fullName,
//         role: user.role,
//         lastLogin: new Date(),
//         preferences: user.preferences,
//       },
//       rememberMe: rememberMe || false,
//       timestamp: new Date().toISOString(),
//     }
//     console.log(`[UserController] Sending response:`, response)
//     res.status(200).json(response)
//   } catch (error) {
//     console.error(`❌ [UserController] Login error: ${error.message} | Request ID: ${req.requestId}`)
//     console.error(`[UserController] Login error stack:`, error.stack)
//     next(error)
//   }
// });

const loginUser = asyncHandler(async (req, res, next) => {
  try {
    const { emailid, password, rememberMe } = req.body;
    console.log(`[UserController] Login attempt for: ${emailid} | Request ID: ${req.requestId}`);

    if (!emailid || !password) {
      return next(new ErrorResponse("Please provide email and password", 400));
    }

    const user = await User.findOne({ emailid }).select("+password +loginAttempts +lockUntil");
    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    if (!user.isActive) {
      return next(new ErrorResponse("Account is inactive. Please contact administrator.", 403));
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
      return next(new ErrorResponse(`Account is locked. Try again in ${lockTimeRemaining} minutes.`, 423));
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      const updates = { $inc: { loginAttempts: 1 } };
      if (user.loginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
      }
      await User.findByIdAndUpdate(user._id, updates);
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Reset login attempts if successful
    if (user.loginAttempts > 0) {
      await User.findByIdAndUpdate(user._id, {
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() },
      });
    } else {
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    }

    const tokenExpiration = rememberMe ? "30d" : "24h";
    const token = createSecretToken(user._id, { role: user.role }, tokenExpiration);

    // Cookie settings
    const cookieOptions = {
      httpOnly: true,
      expires: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)),
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
    };

    // Set cookie
    res.cookie("token", token, cookieOptions);

    console.log(`✅ [UserController] User logged in successfully: ${user.username} | Request ID: ${req.requestId}`);

    // JSON response with token included
    res.status(200).json({
      success: true,
      message: "Login successful",
      token, // ✅ Include token in JSON
      user: {
        _id: user._id,
        username: user.username,
        emailid: user.emailid,
        fullName: user.fullName,
        role: user.role,
        lastLogin: new Date(),
        preferences: user.preferences,
      },
      rememberMe: rememberMe || false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`❌ [UserController] Login error: ${error.message} | Request ID: ${req.requestId}`);
    next(error);
  }
});


/**
 * @desc Forgot password - Send reset link to admin
 * @route POST /api/users/forgot-password
 * @access Public
 */
const forgotPassword = asyncHandler(async (req, res, next) => {
  try {
    const { email } = req.body
    console.log(`[UserController] Forgot password request for: ${email} | Request ID: ${req.requestId}`)

    if (!email) {
      return next(new ErrorResponse("Please provide email address", 400))
    }

    const user = await User.findOne({ emailid: email })
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset request has been sent to the administrator.",
      })
    }

    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex")

    user.passwordResetToken = resetTokenHash
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000
    await user.save({ validateBeforeSave: false })

    const adminUsers = await User.find({ role: "admin", isActive: true }).select("emailid fullName")

    if (adminUsers.length === 0) {
      console.error(`❌ [UserController] No admin users found for password reset notification`)
      return next(new ErrorResponse("Unable to process password reset request", 500))
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetUrl = `${clientUrl}/admin/reset-password/${resetToken}?userId=${user._id}`

    const adminEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Admin Action Required</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            A password reset has been requested for the following user:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p><strong>User:</strong> ${user.fullName || user.username}</p>
            <p><strong>Email:</strong> ${user.emailid}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            As an administrator, you can reset this user's password by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
              style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     color: white; 
                     padding: 15px 30px; 
                     text-decoration: none; 
                     border-radius: 8px; 
                     font-weight: bold;
                     display: inline-block;">
              Reset User Password
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            This link will expire in 1 hour. If you did not expect this request, please ignore this email.
          </p>
          
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            If the button doesn't work, copy and paste this URL into your browser:<br>
            <span style="word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
        
        <div style="background-color: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            2tume IoT Platform - Admin Notification System
          </p>
        </div>
      </div>
    `

    const transporter = createEmailTransporter()
    const emailPromises = adminUsers.map((admin) =>
      transporter.sendMail({
        from: `"2tume IoT Platform" <${process.env.SMTP_USER}>`,
        to: admin.emailid,
        subject: `Password Reset Request - ${user.fullName || user.username}`,
        html: adminEmailContent,
      }),
    )

    try {
      await Promise.all(emailPromises)
      console.log(
        `✅ [UserController] Password reset notification sent to ${adminUsers.length} admin(s) for user: ${email}`,
      )
    } catch (emailError) {
      console.error(`❌ [UserController] Error sending password reset email:`, emailError)
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined
      await user.save({ validateBeforeSave: false })
      return next(new ErrorResponse("Error sending password reset notification", 500))
    }

    res.status(200).json({
      success: true,
      message: "Password reset request has been sent to the administrator.",
    })
  } catch (error) {
    console.error(`❌ [UserController] Forgot password error: ${error.message} | Request ID: ${req.requestId}`)
    next(error)
  }
});

/**
 * @desc Reset password (Admin only)
 * @route POST /api/users/reset-password/:token
 * @access Private/Admin
 */
const resetPassword = asyncHandler(async (req, res, next) => {
  try {
    const { token } = req.params
    const { newPassword, userId } = req.body

    console.log(`[UserController] Password reset attempt with token | Request ID: ${req.requestId}`)

    if (!newPassword) {
      return next(new ErrorResponse("Please provide new password", 400))
    }

    if (newPassword.length < 6) {
      return next(new ErrorResponse("Password must be at least 6 characters long", 400))
    }

    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const user = await User.findOne({
      _id: userId,
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!user) {
      return next(new ErrorResponse("Invalid or expired password reset token", 400))
    }

    user.password = newPassword
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    user.loginAttempts = undefined
    user.lockUntil = undefined
    await user.save()

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const userEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Successful</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Your Password Has Been Reset</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Hello ${user.fullName || user.username},
          </p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your password has been successfully reset by an administrator. You can now log in to your account using your new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${clientUrl}/login" 
              style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     color: white; 
                     padding: 15px 30px; 
                                          text-decoration: none; 
                     border-radius: 8px; 
                     font-weight: bold;
                     display: inline-block;">
              Login to Your Account
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            If you did not request this password reset, please contact your administrator immediately.
          </p>
        </div>
        
        <div style="background-color: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            2tume IoT Platform - Security Notification
          </p>
        </div>
      </div>
    `

    try {
      const transporter = createEmailTransporter()
      await transporter.sendMail({
        from: `"2tume IoT Platform" <${process.env.SMTP_USER}>`,
        to: user.emailid,
        subject: "Your Password Has Been Reset",
        html: userEmailContent,
      })
    } catch (emailError) {
      console.error(`❌ [UserController] Error sending password reset confirmation:`, emailError)
    }

    console.log(
      `✅ [UserController] Password reset successful for user: ${user.username} | Request ID: ${req.requestId}`,
    )

    res.status(200).json({
      success: true,
      message: "Password reset successful. User has been notified.",
    })
  } catch (error) {
    console.error(`❌ [UserController] Reset password error: ${error.message} | Request ID: ${req.requestId}`)
    next(error)
  }
});

/**
 * @desc Get all users with enhanced filtering and pagination
 * @route GET /api/users
 * @access Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res, next) => {
  try {
    const {
      role,
      isActive = "true",
      limit = 50,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = req.query
    console.log(`[UserController] Fetching all users | Request ID: ${req.requestId}`)
    console.log(
      `[UserController] Received query parameters: { role: ${role}, isActive: ${isActive}, search: ${search}, limit: ${limit}, page: ${page}, sortBy: ${sortBy}, sortOrder: ${sortOrder} }`,
    )

    const query = {}
    if (role) query.role = role
    if (isActive !== undefined) {
      query.isActive = isActive === "true"
    } else {
      query.isActive = true
    }

    if (search) {
      query.$text = { $search: search }
    }

    console.log(`[UserController] Constructed Mongoose query:`, query)

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const sortObj = {}
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1

    const totalCount = await User.countDocuments(query)
    const totalPages = Math.ceil(totalCount / Number.parseInt(limit))

    const users = await User.find(query)
      .select("-password -loginAttempts -lockUntil")
      .sort(sortObj)
      .limit(Number.parseInt(limit))
      .skip(skip)
      .populate("devices", "name serialNumber status")
      .lean()

    console.log(`[UserController] Found ${users.length} users matching query:`, query)
    console.log(`[UserController] Total documents in DB matching query (totalCount): ${totalCount}`)

    res.setHeader("X-Total-Count", totalCount)
    res.setHeader("X-Total-Pages", totalPages)
    res.setHeader("X-Current-Page", page)

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages,
        totalCount,
        perPage: Number.parseInt(limit),
        hasNextPage: Number.parseInt(page) < totalPages,
        hasPrevPage: Number.parseInt(page) > 1,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ [UserController] Error fetching users: ${error.message} | Request ID: ${req.requestId}`)
    next(error)
  }
});

/**
 * @desc Get user by ID
 * @route GET /api/users/:id
 * @access Private/Admin or Own Profile
 */
const getUserById = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -loginAttempts -lockUntil")
      .populate("devices", "name serialNumber status")
      .lean()

    if (!user) {
      return next(new ErrorResponse("User not found", 404))
    }

    console.log(`[UserController] User fetched: ${user.username} | Request ID: ${req.requestId}`)

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ [UserController] Error fetching user: ${error.message} | Request ID: ${req.requestId}`)
    next(error)
  }
});

/**
 * @desc Update user
 * @route PUT /api/users/:id
 * @access Private/Admin
 */
const updateUser = asyncHandler(async (req, res, next) => {
  try {
    const {
      username,
      emailid,
      fullName,
      role,
      address,
      phone,
      place,
      location,
      isActive,
      preferences,
      devices,
    } = req.body

    const updateData = {}
    if (username !== undefined) updateData.username = username
    if (emailid !== undefined) updateData.emailid = emailid
    if (fullName !== undefined) updateData.fullName = fullName
    if (role !== undefined) updateData.role = role
    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (place !== undefined) updateData.place = place
    if (location !== undefined) updateData.location = location
    if (isActive !== undefined) updateData.isActive = isActive
    if (preferences !== undefined) updateData.preferences = preferences;

    const user = await User.findById(req.params.id)
      .select("-password -loginAttempts -lockUntil")
      .populate("devices", "_id")

    if (!user) {
      return next(new ErrorResponse("User not found", 404))
    }

    const currentAssignedDeviceIds = user.devices.map((device) => device._id.toString())

    const newAssignedDeviceIds = Array.isArray(devices)
      ? devices.filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      : []

    const devicesToUnassign = currentAssignedDeviceIds.filter((id) => !newAssignedDeviceIds.includes(id))
    if (devicesToUnassign.length > 0) {
      await Device.updateMany(
        { _id: { $in: devicesToUnassign } },
        { $unset: { assignedToUser: 1 } },
      )
      console.log(`[UserController] Unassigned ${devicesToUnassign.length} devices from user ${user.username}.`)
    }

    const devicesToAssign = newAssignedDeviceIds.filter((id) => !currentAssignedDeviceIds.includes(id))
    if (devicesToAssign.length > 0) {
      await Device.updateMany(
        { _id: { $in: devicesToAssign } },
        { $set: { assignedToUser: user._id } },
      )
      console.log(`[UserController] Assigned ${devicesToAssign.length} new devices to user ${user.username}.`)
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .select("-password -loginAttempts -lockUntil")
      .populate("devices", "name serialNumber status")
      .lean()

    console.log(`✅ [UserController] User updated: ${updatedUser.username} | Request ID: ${req.requestId}`)

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ [UserController] Error updating user: ${error.message} | Request ID: ${req.requestId}`)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message)
      return next(new ErrorResponse(messages.join(", "), 400))
    }
    next(error)
  }
});

/**
 * @desc Delete user
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return next(new ErrorResponse("User not found", 404))
    }

    await Device.updateMany(
      { assignedToUser: req.params.id },
      { $unset: { assignedToUser: 1 } },
    )

    console.log(`[UserController] Unassigned all devices from user ${user.username} before deletion.`)

    await user.deleteOne()

    console.log(`✅ [UserController] User deleted: ${user.username} | Request ID: ${req.requestId}`)

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      deletedUser: {
        id: user._id,
        username: user.username,
        emailid: user.emailid,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ [UserController] Error deleting user: ${error.message} | Request ID: ${req.requestId}`)
    next(error)
  }
});

/**
 * @desc Get logged in user profile
 * @route GET /api/users/profile
 * @access Private
 */
const getLoggedInUser = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -loginAttempts -lockUntil")
      .populate("devices", "name serialNumber status lastSeen type parameters")
      .lean()

    if (!user) {
      return next(new ErrorResponse("User profile not found", 404))
    }

    console.log(`[UserController] Profile fetched for: ${user.username} | Request ID: ${req.requestId}`)

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ [UserController] Error fetching profile: ${error.message} | Request ID: ${req.requestId}`)
    next(error)
  }
});

/**
 * @desc Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
const updateUserProfile = asyncHandler(async (req, res, next) => {
  try {
    const { fullName, address, phone, place, location, preferences } = req.body

    const updateData = {}
    if (fullName !== undefined) updateData.fullName = fullName
    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (place !== undefined) updateData.place = place
    if (location !== undefined) updateData.location = location

    if (preferences !== undefined) updateData.preferences = { ...req.user.preferences, ...preferences }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -loginAttempts -lockUntil")

    if (!user) {
      return next(new ErrorResponse("User profile not found for update", 404))
    }

    console.log(`✅ [UserController] Profile updated for: ${user.username} | Request ID: ${req.requestId}`)

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ [UserController] Error updating profile: ${error.message} | Request ID: ${req.requestId}`)
    next(error)
  }
});

/**
 * @desc Change user password
 * @route PUT /api/users/change-password
 * @access Private
 */
const changePassword = asyncHandler(async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse("Please provide current password and new password", 400))
    }

    if (newPassword.length < 6) {
      return next(new ErrorResponse("New password must be at least 6 characters long", 400))
    }

    const user = await User.findById(req.user._id).select("+password")

    if (!user) {
      return next(new ErrorResponse("User not found for password change", 404))
    }

    const isCurrentPasswordValid = await user.matchPassword(currentPassword)

    if (!isCurrentPasswordValid) {
      return next(new ErrorResponse("Current password is not correct", 401))
    }

    user.password = newPassword
    await user.save()

    console.log(
      `✅ [UserController] Password changed successfully for: ${user.username} | Request ID: ${req.requestId}`,
    )

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ [UserController] Error changing password: ${error.message} | Request ID: ${req.requestId}`)
    next(error)
  }
});

const updateUserPreferences = asyncHandler(async (req, res, next) => {
  const { preferences } = req.body;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    user.preferences = {
      ...user.preferences,
      ...preferences,
    };
    
    await user.save();
    
    const updatedUser = await User.findById(userId).select('-password -loginAttempts -lockUntil').lean();

    res.status(200).json({
      success: true,
      message: "User preferences updated successfully",
      data: updatedUser.preferences,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`❌ [UserController] Error updating user preferences: ${error.message} | Request ID: ${req.requestId}`);
    next(error);
  }
});

const updateUserProfilePicture = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  if (!req.file) {
    return next(new ErrorResponse("No file uploaded", 400));
  }

  const profilePictureUrl = req.file.location;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: profilePictureUrl },
      { new: true, runValidators: true }
    ).select('-password -loginAttempts -lockUntil');

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: { profilePicture: user.profilePicture },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [UserController] Error updating profile picture: ${error.message} | Request ID: ${req.requestId}`);
    next(error);
  }
});

/**
 * @desc Get user statistics (total, active, inactive)
 * @route GET /api/users/stats
 * @access Private/Admin
 */
const getUserStats = asyncHandler(async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [UserController] Error fetching user stats: ${error.message}`);
    next(error);
  }
});


module.exports = {
  createUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getLoggedInUser,
  updateUserProfile,
  changePassword,
  updateUserPreferences,
  updateUserProfilePicture,
  getUserStats,
};