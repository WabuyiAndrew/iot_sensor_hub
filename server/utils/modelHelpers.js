// // utils/modelHelpers.js
// const mongoose = require("mongoose");

// function getModels() {
//   try {
//     return {
//       Device: mongoose.model("Device"),
//       SensorData: mongoose.model("SensorData"),
//       TankType: mongoose.model("TankType"),
//       TankVolumeHistory: mongoose.model("TankVolumeHistory"),
//     };
//   } catch (error) {
//     console.error("❌ [Model Helpers] Error accessing models:", error.message);
//     throw new Error("Database models not available");
//   }
// }

// module.exports = {
//   getModels,
// };


// utils/modelHelpers.js
const mongoose = require("mongoose");

function getModels() {
  try {
    return {
      Device: mongoose.model("Device"),
      SensorData: mongoose.model("SensorData"),
      TankType: mongoose.model("TankType"),
      TankVolumeHistory: mongoose.model("TankVolumeHistory"),
      User: mongoose.model("User"), // Ensure User model is also accessible
      Alert: mongoose.model("Alert"), // Ensure Alert model is also accessible
    };
  } catch (error) {
    console.error("❌ [Model Helpers] Error accessing models:", error.message);
    throw new Error("Database models not available");
  }
}

module.exports = {
  getModels,
};
