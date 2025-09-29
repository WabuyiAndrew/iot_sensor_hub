require("dotenv").config()
const mongoose = require("mongoose")
const User = require("../models/User")

const createAdminUser = async () => {
  try {
    // Connect to MongoDB Atlas using your connection string
    const mongoURI = process.env.MONGODB_URI

    if (!mongoURI) {
      console.error("❌ MONGODB_URI not found in environment variables")
      process.exit(1)
    }

    console.log("🔗 Connecting to MongoDB Atlas...")
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log("✅ Connected to MongoDB Atlas successfully")

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ emailid: "admin@iot-system.com" }, { username: "admin" }, { role: "admin" }],
    })

    if (existingAdmin) {
      console.log("⚠️  Admin user already exists:")
      console.log(`   Username: ${existingAdmin.username}`)
      console.log(`   Email: ${existingAdmin.emailid}`)
      console.log(`   Role: ${existingAdmin.role}`)
      console.log(`   Active: ${existingAdmin.isActive}`)
      console.log("")
      console.log("🔑 You can login with:")
      console.log(`   Email: ${existingAdmin.emailid}`)
      console.log(`   Username: ${existingAdmin.username}`)

      await mongoose.connection.close()
      process.exit(0)
    }

    // Create admin user
    console.log("👤 Creating admin user...")
    const adminUser = new User({
      username: "admin",
      emailid: "admin@iot-system.com",
      password: "admin123", // Will be hashed automatically
      fullName: "System Administrator",
      role: "admin",
      isActive: true,
      isEmailVerified: true,
    })

    await adminUser.save()

    console.log("🎉 Admin user created successfully!")
    console.log("")
    console.log("📧 Login Credentials:")
    console.log("   Email: admin@iot-system.com")
    console.log("   Username: admin")
    console.log("   Password: admin123")
    console.log("")
    console.log("⚠️  IMPORTANT: Please change the password after first login!")
    console.log("")
    console.log("🚀 You can now start the server and login with these credentials.")
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message)

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      console.error("Validation errors:", errors)
    }

    if (error.code === 11000) {
      console.error("❌ Duplicate key error - user might already exist")
    }
  } finally {
    try {
      await mongoose.connection.close()
      console.log("📝 Database connection closed")
    } catch (closeError) {
      console.error("❌ Error closing database connection:", closeError.message)
    }
  }
}

// Run the script
createAdminUser()
