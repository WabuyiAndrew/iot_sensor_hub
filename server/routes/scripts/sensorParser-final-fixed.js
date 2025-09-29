// This file is used by both the API controller and the log processing script.

function parseSensorHexString(rawHexString, logTimestamp) {
  // Remove all whitespace from the hex string
  const cleanHex = rawHexString.replace(/\s/g, "").toUpperCase()

  // Basic length check for the fixed header part
  if (cleanHex.length < 32) {
    console.warn(`[Parser] Raw hex string too short (${cleanHex.length} chars) for basic parsing: ${cleanHex}`)
    return null
  }

  // Extract common fields based on the protocol document
  const header = cleanHex.substring(0, 4) // "FEDC"
  if (header !== "FEDC") {
    console.warn(`[Parser] Invalid header (${header}) for hex string: ${cleanHex}`)
    return null
  }

  // Extract Sensor ID and Session ID as hexadecimal strings
  const sensorIdHex = cleanHex.substring(6, 18) // 6 bytes = 12 hex chars
  const sessionIdHex = cleanHex.substring(18, 26) // 4 bytes = 8 hex chars
  const sessionIdDecimal = Number.parseInt(sessionIdHex, 16)

  let sensorType = "UNKNOWN"
  // Determine sensor type based on the unique sensorIdHex
  if (sensorIdHex === "16098522754E") {
    sensorType = "AIR_QUALITY_ULTRASONIC"
  } else if (sensorIdHex === "124A7DA90849") {
    sensorType = "WEATHER_STATION"
  } else {
    console.warn(`[Parser] Unknown Sensor ID (${sensorIdHex}) for type determination. Using generic parsing.`)
    sensorType = "GENERIC"
  }

  const parsedValues = {}

  // Helper to safely parse a 4-byte (8-hex-char) value at specific position
  const parse4ByteHexAt = (position) => {
    if (position + 8 > cleanHex.length) {
      console.warn(
        `[Parser] Not enough data for a 4-byte value at position ${position}. Remaining hex: ${cleanHex.substring(position)}`,
      )
      return null
    }
    const hexVal = cleanHex.substring(position, position + 8)
    return Number.parseInt(hexVal, 16)
  }

  // RSSI conversion heuristic
  const convertRssiToDbm = (rawRssi) => {
    if (rawRssi === null || rawRssi === 0) return -100
    return -(100 - rawRssi)
  }

  // Parse sensor-specific payload based on determined type
  if (sensorType === "AIR_QUALITY_ULTRASONIC") {
    // Air Quality sensor parsing (this is working correctly)
    parsedValues.temperature = parse4ByteHexAt(32) / 10.0
    parsedValues.humidity = parse4ByteHexAt(40) / 10.0
    parsedValues.pm2_5 = parse4ByteHexAt(48)
    parsedValues.pm10 = parse4ByteHexAt(56)
    parsedValues.noise = parse4ByteHexAt(64) / 10.0
    parsedValues.ultrasonic_liquid_level = parse4ByteHexAt(72)
    parsedValues.signal_rssi_raw = parse4ByteHexAt(80)
    parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw)
    parsedValues.error_code = parse4ByteHexAt(88)
    parsedValues.version = parse4ByteHexAt(96) / 10.0
  } else if (sensorType === "WEATHER_STATION") {
    // Weather Station parsing - CORRECTED based on translation document
    // From your translation document, the correct positions are:

    parsedValues.temperature = parse4ByteHexAt(32) / 10.0 // 000000ED = 237 -> 23.7°C ✅
    parsedValues.humidity = parse4ByteHexAt(40) / 10.0 // 000002C2 = 706 -> 70.6% ✅
    parsedValues.atmospheric_pressure = parse4ByteHexAt(48) / 100.0 // 00015878 = 88184 -> 881.84mbar ✅

    // Now the correct positions based on your translation document:
    // Looking at the hex: ...00015878 00000001A 00000026 00000007 000000C4...
    //                     pressure   PM2.5     PM10     wind_spd wind_dir

    parsedValues.pm2_5 = parse4ByteHexAt(56) // 0000001A = 26 ✅
    parsedValues.pm10 = parse4ByteHexAt(64) // 00000026 = 38 ✅
    parsedValues.wind_speed = parse4ByteHexAt(72) / 10.0 // 00000007 = 7 -> 0.7m/s ✅
    parsedValues.wind_direction = parse4ByteHexAt(80) // 000000C4 = 196° ✅
    parsedValues.rainfall = parse4ByteHexAt(88) // 00000000 = 0mm ✅
    parsedValues.total_solar_radiation = parse4ByteHexAt(96) // 00000000 = 0W/m² ✅
    parsedValues.signal_rssi_raw = parse4ByteHexAt(104) // 0000001F = 31 ✅
    parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw)
    parsedValues.error_code = parse4ByteHexAt(112) // 00000000 = 0 ✅
    parsedValues.version = parse4ByteHexAt(120) / 10.0 // 00000075 = 117 -> 11.7 ✅
  } else if (sensorType === "GENERIC") {
    // Basic parsing for unknown sensor types
    parsedValues.temperature = parse4ByteHexAt(32) / 10.0
    parsedValues.humidity = parse4ByteHexAt(40) / 10.0
    parsedValues.signal_rssi_raw = parse4ByteHexAt(80)
    parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw)
    parsedValues.error_code = parse4ByteHexAt(88)
    parsedValues.version = parse4ByteHexAt(96) / 10.0
  }

  return {
    sensorId: sensorIdHex,
    sessionId: sessionIdDecimal,
    sensorType: sensorType,
    timestamp: logTimestamp ? new Date(logTimestamp) : new Date(),
    ...parsedValues,
    raw_payload_hex: rawHexString,
    raw_sensor_id_hex: sensorIdHex,
    raw_session_id_hex: sessionIdHex,
  }
}

module.exports = parseSensorHexString
