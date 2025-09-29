const parseSensorHexString = require("../utils/sensorParser")

// Test data from your translation document - CORRECTED
const testData = [
  {
    name: "Air Quality + Ultrasonic",
    // From your doc: FE DC 01 16 09 85 22 75 4E 00 00 00 00 03 00 24 00 00 01 27 00 00 02 1E 00 00 00 20 00 00 00 2E 00 00 01 2C 00 00 00 00 00 00 00 1A 00 00 00 00 00 00 00 75 00
    hex: "FEDC0116098522754E00000000030024000001270000021E000000200000002E0000012C000000000000001A00000000000000750",
    expected: {
      sensorType: "AIR_QUALITY_ULTRASONIC",
      sensorId: "16098522754E",
      temperature: 29.5, // 0x0127 = 295, /10 = 29.5
      humidity: 54.2, // 0x021E = 542, /10 = 54.2
      pm2_5: 32, // 0x0020 = 32
      pm10: 46, // 0x002E = 46
      noise: 30.0, // 0x012C = 300, /10 = 30.0
      ultrasonic_liquid_level: 0, // 0x0000 = 0
      signal_rssi_raw: 26, // 0x001A = 26
    },
  },
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
      wind_direction: 1960, // 0x00C4 = 196, *10 = 1960
      rainfall: 0, // 0x0000 = 0
      total_solar_radiation: 0, // 0x0000 = 0
      signal_rssi_raw: 31, // 0x001F = 31
    },
  },
]

console.log("🧪 Testing Sensor Parser with CORRECTED Data from Translation Document")
console.log("=".repeat(70))

testData.forEach((test, index) => {
  console.log(`\n${index + 1}. Testing ${test.name}:`)
  console.log(`   Hex Length: ${test.hex.length} characters`)
  console.log(`   Expected Sensor ID: ${test.expected.sensorId}`)

  try {
    const result = parseSensorHexString(test.hex, "2024-01-01 12:00:00.000")

    if (!result) {
      console.log("   ❌ Parser returned null")
      return
    }

    console.log(`\n   📊 PARSING RESULTS:`)
    console.log(`   ✅ Sensor Type: ${result.sensorType}`)
    console.log(`   ✅ Sensor ID: ${result.sensorId}`)

    // Temperature comparison
    const tempMatch = Math.abs(result.temperature - test.expected.temperature) < 0.1
    console.log(
      `   ${tempMatch ? "✅" : "❌"} Temperature: ${result.temperature}°C (expected: ${test.expected.temperature}°C)`,
    )

    // Humidity comparison
    const humidityMatch = Math.abs(result.humidity - test.expected.humidity) < 0.1
    console.log(
      `   ${humidityMatch ? "✅" : "❌"} Humidity: ${result.humidity}% (expected: ${test.expected.humidity}%)`,
    )

    if (result.ultrasonic_liquid_level !== undefined) {
      const levelMatch = result.ultrasonic_liquid_level === test.expected.ultrasonic_liquid_level
      console.log(
        `   ${levelMatch ? "✅" : "❌"} Liquid Level: ${result.ultrasonic_liquid_level}m (expected: ${test.expected.ultrasonic_liquid_level}m)`,
      )

      const pm25Match = result.pm2_5 === test.expected.pm2_5
      console.log(`   ${pm25Match ? "✅" : "❌"} PM2.5: ${result.pm2_5}μg/m³ (expected: ${test.expected.pm2_5}μg/m³)`)

      const pm10Match = result.pm10 === test.expected.pm10
      console.log(`   ${pm10Match ? "✅" : "❌"} PM10: ${result.pm10}μg/m³ (expected: ${test.expected.pm10}μg/m³)`)

      const noiseMatch = Math.abs(result.noise - test.expected.noise) < 0.1
      console.log(`   ${noiseMatch ? "✅" : "❌"} Noise: ${result.noise}db (expected: ${test.expected.noise}db)`)
    }

    if (result.atmospheric_pressure !== undefined) {
      const pressureMatch = Math.abs(result.atmospheric_pressure - test.expected.atmospheric_pressure) < 0.1
      console.log(
        `   ${pressureMatch ? "✅" : "❌"} Pressure: ${result.atmospheric_pressure}mbar (expected: ${test.expected.atmospheric_pressure}mbar)`,
      )

      const windSpeedMatch = Math.abs(result.wind_speed - test.expected.wind_speed) < 0.1
      console.log(
        `   ${windSpeedMatch ? "✅" : "❌"} Wind Speed: ${result.wind_speed}m/s (expected: ${test.expected.wind_speed}m/s)`,
      )

      const windDirMatch = result.wind_direction === test.expected.wind_direction
      console.log(
        `   ${windDirMatch ? "✅" : "❌"} Wind Direction: ${result.wind_direction}° (expected: ${test.expected.wind_direction}°)`,
      )
    }

    const rssiMatch = result.signal_rssi_raw === test.expected.signal_rssi_raw
    console.log(
      `   ${rssiMatch ? "✅" : "❌"} RSSI: ${result.signal_rssi_raw} (expected: ${test.expected.signal_rssi_raw}) → ${result.signal_rssi_dbm}dBm`,
    )

    console.log(`\n   📋 FULL PARSED DATA:`)
    console.log(`   ${JSON.stringify(result, null, 6)}`)
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }
})

console.log("\n" + "=".repeat(70))
console.log("🔍 Testing Invalid Data (should be rejected):")
const invalidData = [
  "1603000069010000650303551CA7E472616E646F6D", // TLS handshake
  "FEDC", // Too short
  "1234567890ABCDEF", // Wrong header
]

invalidData.forEach((hex, index) => {
  console.log(`\n${index + 1}. Testing invalid hex: ${hex.substring(0, 30)}...`)
  try {
    const result = parseSensorHexString(hex, "2024-01-01 12:00:00.000")
    if (result) {
      console.log("   ⚠️  Unexpectedly parsed invalid data!")
    } else {
      console.log("   ✅ Correctly rejected invalid data")
    }
  } catch (error) {
    console.log(`   ✅ Correctly rejected: ${error.message}`)
  }
})
