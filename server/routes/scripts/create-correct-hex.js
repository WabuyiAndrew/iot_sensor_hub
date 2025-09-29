console.log("🔍 Creating Correct Hex String from Translation Document")
console.log("==================================================\n")

// From your translation document:
// FE DC 01 12 4A 7D A9 08 49 00 00 00 00 03 00 30
// 00 00 00 ED 00 00 02 C2 00 01 58 78 00 00 00 1A
// 00 00 00 26 00 00 00 07 00 00 00 C4 00 00 00 00
// 00 00 00 00 00 00 00 1F 00 00 00 00 00 00 00 75 00

const correctHexWithSpaces = `FE DC 01 12 4A 7D A9 08 49 00 00 00 00 03 00 30 00 00 00 ED 00 00 02 C2 00 01 58 78 00 00 00 1A 00 00 00 26 00 00 00 07 00 00 00 C4 00 00 00 00 00 00 00 00 00 00 00 1F 00 00 00 00 00 00 00 75 00`

const correctHexClean = correctHexWithSpaces.replace(/\s/g, "")

console.log("Correct hex from translation document:")
console.log(correctHexClean)
console.log(`Length: ${correctHexClean.length}`)

console.log("\n🔍 Field Analysis:")
console.log(
  "Position 56-64 (PM2.5):",
  correctHexClean.substring(56, 64),
  "=",
  Number.parseInt(correctHexClean.substring(56, 64), 16),
)
console.log(
  "Position 64-72 (PM10):",
  correctHexClean.substring(64, 72),
  "=",
  Number.parseInt(correctHexClean.substring(64, 72), 16),
)
console.log(
  "Position 72-80 (Wind Speed):",
  correctHexClean.substring(72, 80),
  "=",
  Number.parseInt(correctHexClean.substring(72, 80), 16),
)
console.log(
  "Position 80-88 (Wind Direction):",
  correctHexClean.substring(80, 88),
  "=",
  Number.parseInt(correctHexClean.substring(80, 88), 16),
)
console.log(
  "Position 104-112 (RSSI):",
  correctHexClean.substring(104, 112),
  "=",
  Number.parseInt(correctHexClean.substring(104, 112), 16),
)
console.log(
  "Position 120-128 (Version):",
  correctHexClean.substring(120, 128),
  "=",
  Number.parseInt(correctHexClean.substring(120, 128), 16),
)

console.log("\n🧪 Testing with CORRECT hex string:")

const parseSensorHexString = require("../utils/sensorParser-final-fixed")
const result = parseSensorHexString(correctHexClean, "2024-01-01 09:00:00.000")

console.log("\n📊 PARSING RESULTS:")
console.log(`   ✅ Sensor Type: ${result.sensorType}`)
console.log(`   ✅ Sensor ID: ${result.sensorId}`)
console.log(`   ${result.temperature === 23.7 ? "✅" : "❌"} Temperature: ${result.temperature}°C (expected: 23.7°C)`)
console.log(`   ${result.humidity === 70.6 ? "✅" : "❌"} Humidity: ${result.humidity}% (expected: 70.6%)`)
console.log(
  `   ${result.atmospheric_pressure === 881.84 ? "✅" : "❌"} Pressure: ${result.atmospheric_pressure}mbar (expected: 881.84mbar)`,
)
console.log(`   ${result.pm2_5 === 26 ? "✅" : "❌"} PM2.5: ${result.pm2_5}μg/m³ (expected: 26μg/m³)`)
console.log(`   ${result.pm10 === 38 ? "✅" : "❌"} PM10: ${result.pm10}μg/m³ (expected: 38μg/m³)`)
console.log(`   ${result.wind_speed === 0.7 ? "✅" : "❌"} Wind Speed: ${result.wind_speed}m/s (expected: 0.7m/s)`)
console.log(
  `   ${result.wind_direction === 196 ? "✅" : "❌"} Wind Direction: ${result.wind_direction}° (expected: 196°)`,
)
console.log(`   ${result.rainfall === 0 ? "✅" : "❌"} Rainfall: ${result.rainfall}mm (expected: 0mm)`)
console.log(
  `   ${result.total_solar_radiation === 0 ? "✅" : "❌"} Solar Radiation: ${result.total_solar_radiation}W/m² (expected: 0W/m²)`,
)
console.log(`   ${result.signal_rssi_raw === 31 ? "✅" : "❌"} RSSI: ${result.signal_rssi_raw} (expected: 31)`)
console.log(`   ${result.error_code === 0 ? "✅" : "❌"} Error Code: ${result.error_code} (expected: 0)`)
console.log(`   ${result.version === 11.7 ? "✅" : "❌"} Version: ${result.version} (expected: 11.7)`)
