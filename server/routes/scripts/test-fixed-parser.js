const parseSensorHexString = require("../utils/sensorParser-fixed")

// Test with the corrected parser
const testData = [
  {
    name: "Weather Station",
    // From your doc: FE DC 01 12 4A 7D A9 08 49 00 00 00 00 03 00 30 00 00 00 ED 00 00 02 C2 00 01 58 78 00 00 00 1A 00 00 00 26 00 00 00 07 00 00 00 C4 00 00 00 00 00 00 00 00 00 00 00 1F 00 00 00 00 00 00 00 75 00
    hex: "FEDC01124A7DA9084900000000030030000000ED000002C20001587800000001A000000260000000700000C40000000000000000000000001F00000000000000750",
    expected: {
      sensorType: "WEATHER_STATION",
      sensorId: "124A7DA90849",
      temperature: 23.7, // 0x00ED = 237, /10 = 23.7
      humidity: 70.6, // 0x02C2 = 706, /10 = 70.6
      atmospheric_pressure: 881.84, // 0x015878 = 88184, /100 = 881.84
      pm2_5: 26, // 0x001A = 26
      pm10: 38, // 0x0026 = 38
      wind_speed: 0.7, // 0x0007 = 7, /10 = 0.7
      wind_direction: 196, // 0x00C4 = 196 degrees (corrected)
      rainfall: 0, // 0x0000 = 0
      total_solar_radiation: 0, // 0x0000 = 0
      signal_rssi_raw: 31, // 0x001F = 31
    },
  },
]

console.log("🧪 Testing FIXED Weather Station Parser")
console.log("=".repeat(50))

const test = testData[0]
console.log(`\nTesting ${test.name}:`)

try {
  const result = parseSensorHexString(test.hex, "2024-01-01 12:00:00.000")

  if (!result) {
    console.log("   ❌ Parser returned null")
    // Removed the illegal return statement
  }

  console.log(`\n   📊 PARSING RESULTS:`)
  console.log(`   ✅ Sensor Type: ${result.sensorType}`)
  console.log(`   ✅ Sensor ID: ${result.sensorId}`)

  // Check each field
  const checks = [
    { field: "temperature", unit: "°C" },
    { field: "humidity", unit: "%" },
    { field: "atmospheric_pressure", unit: "mbar" },
    { field: "pm2_5", unit: "μg/m³" },
    { field: "pm10", unit: "μg/m³" },
    { field: "wind_speed", unit: "m/s" },
    { field: "wind_direction", unit: "°" },
    { field: "rainfall", unit: "mm" },
    { field: "total_solar_radiation", unit: "W/m²" },
    { field: "signal_rssi_raw", unit: "" },
  ]

  checks.forEach((check) => {
    const actual = result[check.field]
    const expected = test.expected[check.field]
    const match = Math.abs(actual - expected) < 0.1
    console.log(`   ${match ? "✅" : "❌"} ${check.field}: ${actual}${check.unit} (expected: ${expected}${check.unit})`)
  })

  console.log(`\n   📋 FULL PARSED DATA:`)
  console.log(`   ${JSON.stringify(result, null, 4)}`)
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`)
}
