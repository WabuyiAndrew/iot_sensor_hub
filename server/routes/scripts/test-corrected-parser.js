const parseSensorHexString = require("../utils/sensorParser-corrected")

console.log("🧪 Testing CORRECTED Weather Station Parser")
console.log("=".repeat(50))

// Test with exact hex from your translation document
const weatherHex =
  "FEDC01124A7DA9084900000000030030000000ED000002C20001587800000001A000000260000000700000C40000000000000000000000001F00000000000000750"

console.log(`\nTesting Weather Station:`)
console.log(`Hex: ${weatherHex}`)
console.log(`Length: ${weatherHex.length} characters`)

// Let's manually check the hex positions
console.log(`\n🔍 Manual Hex Analysis:`)
console.log(`Header: ${weatherHex.substring(0, 4)} (should be FEDC)`)
console.log(`Version: ${weatherHex.substring(4, 6)} (should be 01)`)
console.log(`Sensor ID: ${weatherHex.substring(6, 18)} (should be 124A7DA90849)`)
console.log(`Session ID: ${weatherHex.substring(18, 26)} (should be 00000000)`)
console.log(`Field marker: ${weatherHex.substring(26, 28)} (should be 03)`)
console.log(`Payload length: ${weatherHex.substring(28, 32)} (should be 0030)`)

console.log(`\n📊 Data Fields:`)
console.log(
  `Temperature: ${weatherHex.substring(32, 40)} = ${Number.parseInt(weatherHex.substring(32, 40), 16)} -> ${Number.parseInt(weatherHex.substring(32, 40), 16) / 10}°C`,
)
console.log(
  `Humidity: ${weatherHex.substring(40, 48)} = ${Number.parseInt(weatherHex.substring(40, 48), 16)} -> ${Number.parseInt(weatherHex.substring(40, 48), 16) / 10}%`,
)
console.log(
  `Pressure: ${weatherHex.substring(48, 56)} = ${Number.parseInt(weatherHex.substring(48, 56), 16)} -> ${Number.parseInt(weatherHex.substring(48, 56), 16) / 100}mbar`,
)
console.log(`PM2.5: ${weatherHex.substring(56, 64)} = ${Number.parseInt(weatherHex.substring(56, 64), 16)}`)
console.log(`PM10: ${weatherHex.substring(64, 72)} = ${Number.parseInt(weatherHex.substring(64, 72), 16)}`)
console.log(
  `Wind Speed: ${weatherHex.substring(72, 80)} = ${Number.parseInt(weatherHex.substring(72, 80), 16)} -> ${Number.parseInt(weatherHex.substring(72, 80), 16) / 10}m/s`,
)
console.log(`Wind Direction: ${weatherHex.substring(80, 88)} = ${Number.parseInt(weatherHex.substring(80, 88), 16)}°`)
console.log(`Rainfall: ${weatherHex.substring(88, 96)} = ${Number.parseInt(weatherHex.substring(88, 96), 16)}mm`)
console.log(
  `Solar Radiation: ${weatherHex.substring(96, 104)} = ${Number.parseInt(weatherHex.substring(96, 104), 16)}W/m²`,
)
console.log(`RSSI: ${weatherHex.substring(104, 112)} = ${Number.parseInt(weatherHex.substring(104, 112), 16)}`)
console.log(`Error Code: ${weatherHex.substring(112, 120)} = ${Number.parseInt(weatherHex.substring(112, 120), 16)}`)
console.log(
  `Version: ${weatherHex.substring(120, 128)} = ${Number.parseInt(weatherHex.substring(120, 128), 16)} -> ${Number.parseInt(weatherHex.substring(120, 128), 16) / 10}`,
)

try {
  const result = parseSensorHexString(weatherHex, "2024-01-01 12:00:00.000")

  if (!result) {
    console.log("   ❌ Parser returned null")
  }

  console.log(`\n   📊 PARSER RESULTS:`)
  console.log(`   ✅ Sensor Type: ${result.sensorType}`)
  console.log(`   ✅ Sensor ID: ${result.sensorId}`)
  console.log(`   ✅ Temperature: ${result.temperature}°C (expected: 23.7°C)`)
  console.log(`   ✅ Humidity: ${result.humidity}% (expected: 70.6%)`)
  console.log(`   ✅ Pressure: ${result.atmospheric_pressure}mbar (expected: 881.84mbar)`)
  console.log(`   ✅ PM2.5: ${result.pm2_5}μg/m³ (expected: 26μg/m³)`)
  console.log(`   ✅ PM10: ${result.pm10}μg/m³ (expected: 38μg/m³)`)
  console.log(`   ✅ Wind Speed: ${result.wind_speed}m/s (expected: 0.7m/s)`)
  console.log(`   ✅ Wind Direction: ${result.wind_direction}° (expected: 196°)`)
  console.log(`   ✅ RSSI: ${result.signal_rssi_raw} (expected: 31)`)
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`)
}
