/**
 * Script to reset a user's password
 * Usage: node reset-user-password.js <email> <new-password>
 * Example: node reset-user-password.js admin@example.com newpassword123
 */

require("dotenv").config()
const mongoose = require("mongoose")
const User = require("./models/user")

async function resetUserPassword() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log("❌ Usage: node reset-user-password.js <email> <new-password>")
    console.log("   Example: node reset-user-password.js admin@example.com newpassword123")
    process.exit(1)
  }

  const [email, newPassword] = args

  try {
    console.log("🔗 Connecting to MongoDB...")

    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    })

    console.log("✅ Connected to MongoDB")

    // Find user by email
    const user = await User.findOne({ emailid: email.toLowerCase() })

    if (!user) {
      console.log(`❌ User not found with email: ${email}`)

      // Show available users
      const allUsers = await User.find({}).select("emailid username").lean()
      if (allUsers.length > 0) {
        console.log("\n📋 Available users:")
        allUsers.forEach((u) => console.log(`   - ${u.emailid} (${u.username})`))
      }
      return
    }

    // Update password
    user.password = newPassword
    await user.save()

    console.log(`✅ Password updated successfully for ${user.emailid}`)
    console.log(`   Username: ${user.username}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   New Password: ${newPassword}`)
    console.log(`   Active: ${user.isActive}`)
  } catch (error) {
    console.error("❌ Error resetting password:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
    process.exit(0)
  }
}

resetUserPassword()
