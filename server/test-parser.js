/**
 * Test script to verify the sensor parser with your actual data
 */
const parseSensorHexString = require("./utils/sensorParser")

// Test with your actual log line
const testLine =
  "2025-06-22 14:17:53.950 [nioEventLoopGroup-3-1] INFO  i.e.processors.IoTByteProcessor - PORT[WeatherS-8700] Bytes in Hex: FE DC 01 12 4A 7D A9 08 49 00 00 00 00 03 00 30 00 00 00 C5 00 00 03 E7 00 01 57 55 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 C5 00 00 01 7D 00 00 00 00 00 00 00 1F 00 00 00 00 00 00 00 75 00"

console.log("Testing parser with actual log line...")
console.log("Input:", testLine)
console.log("\n" + "=".repeat(50))

const result = parseSensorHexString(testLine)

if (result) {
  console.log("✅ Successfully parsed!")
  console.log("📊 Parsed data:")
  console.log(JSON.stringify(result, null, 2))

  console.log("\n🔍 Key values:")
  console.log(`  Temperature: ${result.temperature}°C`)
  console.log(`  Humidity: ${result.humidity}%`)
  console.log(`  Atmospheric Pressure: ${result.atmospheric_pressure} mbar`)
  console.log(`  PM2.5: ${result.pm2_5} µg/m³`)
  console.log(`  PM10: ${result.pm10} µg/m³`)
  console.log(`  Wind Speed: ${result.wind_speed} m/s`)
  console.log(`  Wind Direction: ${result.wind_direction}°`)
  console.log(`  Rainfall: ${result.rainfall} mm`)
  console.log(`  Solar Radiation: ${result.total_solar_radiation} W/m²`)
  console.log(`  Signal RSSI: ${result.signal_rssi_raw} (${result.signal_rssi_dbm} dBm)`)
  console.log(`  Version: ${result.version}`)
  console.log(`  Timestamp: ${result.timestamp}`)
} else {
  console.log("❌ Failed to parse!")
}
