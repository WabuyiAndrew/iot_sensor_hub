const parseSensorHexString = require("../utils/sensorParser-final-fixed")

console.log("🧪 Testing FINAL CORRECTED Weather Station Parser")
console.log("==================================================\n")

// Weather Station hex from translation document
const weatherHex =
  "FEDC01124A7DA9084900000000030030000000ED000002C20001587800000001A000000260000000700000C40000000000000000000000001F00000000000000750"

console.log("Testing Weather Station:")
const result = parseSensorHexString(weatherHex, "2024-01-01 09:00:00.000")

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

console.log("\n📋 FULL PARSED DATA:")
console.log(JSON.stringify(result, null, 2))
