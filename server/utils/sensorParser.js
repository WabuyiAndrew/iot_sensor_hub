// // /**
// //  * FIXED Enhanced parser for IoT sensor log lines.
// //  * Based on the actual protocol documentation provided.
// //  *
// //  * Protocol Structure:
// //  * FE DC - Header
// //  * 01 - Version
// //  * [6 bytes] - Sensor ID
// //  * [4 bytes] - Session ID
// //  * 03 - Order
// //  * [2 bytes] - Length
// //  * [Data payload based on sensor type]
// //  * 00 - End marker
// //  *
// //  * @param {string} rawLine - Raw hex string or full log line.
// //  * @returns {object|null}
// //  */
// // function parseSensorHexString(rawLine) {
// //   // 1. Extract timestamp at start of line, if present
// //   let timestamp = null
// //   const tsMatch = rawLine.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)/)
// //   if (tsMatch) {
// //     timestamp = new Date(tsMatch[1])
// //     console.log(`[PARSER] Extracted timestamp: ${timestamp.toISOString()}`)
// //   }

// //   // 2. Extract the hex string (find first long-enough hex sequence)
// //   const hexMatch = rawLine.match(/([A-Fa-f0-9]{2}(?:[\s:][A-Fa-f0-9]{2}){20,})/)
// //   const hexString = hexMatch ? hexMatch[0].replace(/:/g, " ") : rawLine

// //   // 3. Remove whitespace, uppercase
// //   const cleanHex = hexString.replace(/\s/g, "").toUpperCase()

// //   // 4. Filter: skip if too short or not FEDC
// //   if (cleanHex.length < 64) {
// //     console.log(`[PARSER] Hex too short: ${cleanHex.length} chars`)
// //     return null
// //   }

// //   const header = cleanHex.substring(0, 4)
// //   if (header !== "FEDC") {
// //     console.log(`[PARSER] Invalid header: ${header}`)
// //     return null
// //   }

// //   // 5. Extract protocol fields
// //   const version = cleanHex.substring(4, 6)
// //   const sensorIdHex = cleanHex.substring(6, 18) // 6 bytes = 12 hex chars
// //   const sessionIdHex = cleanHex.substring(18, 26) // 4 bytes = 8 hex chars
// //   const sessionIdDecimal = Number.parseInt(sessionIdHex, 16)
// //   const order = cleanHex.substring(26, 28)
// //   const lengthHex = cleanHex.substring(28, 32)
// //   const lengthDecimal = Number.parseInt(lengthHex, 16)

// //   console.log(`[PARSER] Sensor ID: ${sensorIdHex}, Session: ${sessionIdDecimal}, Length: ${lengthDecimal}`)

// //   // 6. Determine sensor type based on sensor ID
// //   let sensorType = "generic"
// //   if (sensorIdHex === "16098522754E") {
// //     sensorType = "air_quality"
// //   } else if (sensorIdHex === "124A7DA90849") {
// //     sensorType = "weather"
// //   }

// //   console.log(`[PARSER] Detected sensor type: ${sensorType}`)

// //   // 7. Parse data payload starting at position 32
// //   let currentIndex = 32
// //   const parse4ByteHex = () => {
// //     if (currentIndex + 8 > cleanHex.length) {
// //       console.log(`[PARSER] Not enough data at index ${currentIndex}`)
// //       return null
// //     }
// //     const hexVal = cleanHex.substring(currentIndex, currentIndex + 8)
// //     currentIndex += 8
// //     const value = Number.parseInt(hexVal, 16)
// //     console.log(`[PARSER] Parsed ${hexVal} -> ${value}`)
// //     return value
// //   }

// //   // RSSI conversion (same as before)
// //   const convertRssiToDbm = (rawRssi) => {
// //     if (rawRssi === null || rawRssi === undefined) return null
// //     if (rawRssi === 0) return -100
// //     return -(100 - rawRssi)
// //   }

// //   // 8. Parse values based on sensor type and protocol documentation
// //   const parsedValues = {}

// //   if (sensorType === "air_quality") {
// //     // Air Quality + Noise + Ultrasonic depth sensor
// //     // Based on: 16 09 85 22 75 4E protocol
// //     parsedValues.temperature = parse4ByteHex() / 10.0 // Temperature in 0.1°C
// //     parsedValues.humidity = parse4ByteHex() / 10.0 // Humidity in 0.1%RH
// //     parsedValues.pm2_5 = parse4ByteHex() // PM2.5 in ug/m3
// //     parsedValues.pm10 = parse4ByteHex() // PM10 in ug/m3
// //     parsedValues.noise = parse4ByteHex() / 10.0 // Noise in 0.1dB
// //     parsedValues.ultrasonic_liquid_level = parse4ByteHex() / 1000.0 // Ultrasonic in mm -> m
// //     parsedValues.signal_rssi_raw = parse4ByteHex() // RSSI raw value
// //     parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw)
// //     parsedValues.error_code = parse4ByteHex() // Error code
// //     parsedValues.version = parse4ByteHex() / 10.0 // Version in 0.1
// //   } else if (sensorType === "weather") {
// //     // Weather station sensor
// //     // Based on: 12 4A 7D A9 08 49 protocol
// //     parsedValues.temperature = parse4ByteHex() / 10.0 // Temperature in 0.1°C
// //     parsedValues.humidity = parse4ByteHex() / 10.0 // Humidity in 0.1%RH
// //     parsedValues.atmospheric_pressure = parse4ByteHex() / 100.0 // Pressure in 0.01mbar
// //     parsedValues.pm2_5 = parse4ByteHex() // PM2.5 in ug/m3
// //     parsedValues.pm10 = parse4ByteHex() // PM10 in ug/m3
// //     parsedValues.wind_speed = parse4ByteHex() / 10.0 // Wind speed in 0.1m/s
// //     parsedValues.wind_direction = parse4ByteHex() // Wind direction in degrees
// //     parsedValues.rainfall = parse4ByteHex() / 10.0 // Rainfall in 0.1mm
// //     parsedValues.total_solar_radiation = parse4ByteHex() // Solar radiation in W/m²
// //     parsedValues.signal_rssi_raw = parse4ByteHex() // RSSI raw value
// //     parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw)
// //     parsedValues.error_code = parse4ByteHex() // Error code
// //     parsedValues.version = parse4ByteHex() / 10.0 // Version in 0.1
// //   } else {
// //     // Generic fallback
// //     console.log(`[PARSER] Using generic parsing for unknown sensor: ${sensorIdHex}`)
// //     parsedValues.temperature = parse4ByteHex() / 10.0
// //     parsedValues.humidity = parse4ByteHex() / 10.0
// //     parsedValues.signal_rssi_raw = parse4ByteHex()
// //     parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw)
// //     parsedValues.error_code = parse4ByteHex()
// //     parsedValues.version = parse4ByteHex() / 10.0
// //   }

// //   // 9. Validation: skip incomplete/malformed packets
// //   if (parsedValues.temperature == null || Number.isNaN(parsedValues.temperature)) {
// //     console.log(`[PARSER] Invalid temperature value: ${parsedValues.temperature}`)
// //     return null
// //   }

// //   // 10. Log parsed values for debugging
// //   console.log(`[PARSER] Successfully parsed ${sensorType} data:`, {
// //     sensorId: sensorIdHex,
// //     timestamp: timestamp ? timestamp.toISOString() : "current",
// //     temperature: parsedValues.temperature,
// //     humidity: parsedValues.humidity,
// //     version: parsedValues.version,
// //   })

// //   return {
// //     sensorId: sensorIdHex,
// //     sessionId: sessionIdDecimal,
// //     sensorType,
// //     timestamp: timestamp ? timestamp : new Date(), // Use extracted timestamp or current time
// //     ...parsedValues,
// //     raw_payload_hex: hexString,
// //     raw_sensor_id_hex: sensorIdHex,
// //     raw_session_id_hex: sessionIdHex,
// //   }
// // }

// // module.exports = parseSensorHexString





// // backend/utils/sensorParser.js
// /**
//  * FIXED Enhanced parser for IoT sensor log lines.
//  * Based on the actual protocol documentation provided.
//  *
//  * Protocol Structure:
//  * FE DC - Header (2 bytes)
//  * 01 - Version (1 byte)
//  * [6 bytes] - Sensor ID (this is the device's serial number)
//  * [4 bytes] - Session ID
//  * 03 - Order (1 byte)
//  * [2 bytes] - Length (length of the data payload in bytes)
//  * [Variable Data payload based on sensor type]
//  * 00 - End marker (1 byte, though not always present in actual data streams)
//  *
//  * @param {string} rawLine - Raw hex string or full log line.
//  * @returns {object|null} A parsed sensor data object, or null if parsing fails.
//  */
// function parseSensorHexString(rawLine) {
//     // 1. Extract timestamp at start of line, if present (optional, for log file parsing)
//     let timestamp = null;
//     const tsMatch = rawLine.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
//     if (tsMatch) {
//         timestamp = new Date(tsMatch[1]);
//         console.log(`[PARSER] Extracted timestamp from log line: ${timestamp.toISOString()}`);
//     }

//     // 2. Extract the hex string (find first long-enough hex sequence, remove spaces/colons)
//     // This regex looks for at least 20 hex byte pairs (40 hex chars), allowing spaces or colons
//     const hexMatch = rawLine.match(/([A-Fa-f0-9]{2}(?:[\s:]?[A-Fa-f0-9]{2}){19,})/);
//     let rawHexStringWithoutSeparators = hexMatch ? hexMatch[0].replace(/[\s:]/g, "") : rawLine.replace(/[\s:]/g, "");

//     // 3. Ensure it's uppercase for consistent comparison
//     const cleanHex = rawHexStringWithoutSeparators.toUpperCase();

//     // 4. Initial Validation: Check minimum length and header
//     // Minimum length for header + version + sensorId + sessionId + order + length = 2+1+6+4+1+2 = 16 bytes = 32 hex chars
//     const MIN_PROTOCOL_LENGTH_HEX = 32; // FEDC + 01 + 16098522754E + 00000001 + 03 + 0020 = 32 hex chars for fixed part
//     if (cleanHex.length < MIN_PROTOCOL_LENGTH_HEX) {
//         console.log(`[PARSER] Hex string too short (${cleanHex.length} chars). Expected at least ${MIN_PROTOCOL_LENGTH_HEX}. Skipping.`);
//         return null;
//     }

//     const header = cleanHex.substring(0, 4);
//     if (header !== "FEDC") {
//         console.log(`[PARSER] Invalid header: '${header}'. Expected 'FEDC'. Skipping.`);
//         return null;
//     }

//     // 5. Extract fixed protocol fields
//     const versionHex = cleanHex.substring(4, 6);
//     const sensorIdHex = cleanHex.substring(6, 18); // 6 bytes = 12 hex chars (this is the device's serial number)
//     const sessionIdHex = cleanHex.substring(18, 26); // 4 bytes = 8 hex chars
//     const orderHex = cleanHex.substring(26, 28); // 1 byte = 2 hex chars
//     const lengthHex = cleanHex.substring(28, 32); // 2 bytes = 4 hex chars

//     // Convert hex to decimal where appropriate
//     const version = parseInt(versionHex, 16) / 10.0; // Assuming version like 0.1, 0.2
//     const sessionIdDecimal = parseInt(sessionIdHex, 16);
//     const lengthDecimal = parseInt(lengthHex, 16); // Data payload length in bytes

//     console.log(`[PARSER] Extracted: Version=${version}, Sensor ID=${sensorIdHex}, Session=${sessionIdDecimal}, Order=${orderHex}, Data Length=${lengthDecimal} bytes`);

//     // 6. Determine sensor type based on sensor ID (serial number)
//     let sensorType = "unknown"; // Default to unknown
//     if (sensorIdHex === "16098522754E") {
//         sensorType = "air_quality"; // This type will also include noise and ultrasonic_liquid_level based on your protocol
//     } else if (sensorIdHex === "124A7DA90849") {
//         sensorType = "weather";
//     }
//     // Add more sensor type mappings here if you have other device types
//     // e.g., if (sensorIdHex === "YOUR_LIQUID_LEVEL_SENSOR_ID") { sensorType = "liquid_level"; }

//     console.log(`[PARSER] Determined sensor type: ${sensorType}`);

//     // 7. Parse variable data payload starting at position 32 (after fixed header fields)
//     let currentIndex = 32; // Current position in the cleanHex string for data payload
//     const parsedValues = {};

//     // Helper function to parse the next 4-byte (8 hex char) value and advance the index
//     const parse4ByteHex = () => {
//         if (currentIndex + 8 > cleanHex.length) {
//             console.warn(`[PARSER] Not enough data remaining to extract 4 bytes at index ${currentIndex}. Remaining hex: ${cleanHex.substring(currentIndex)}`);
//             return null; // Indicate insufficient data
//         }
//         const hexVal = cleanHex.substring(currentIndex, currentIndex + 8);
//         currentIndex += 8; // Move index past the extracted value
//         const value = parseInt(hexVal, 16);
//         return value;
//     };

//     // Helper function for RSSI conversion
//     const convertRssiToDbm = (rawRssi) => {
//         if (rawRssi === null || rawRssi === undefined) return null;
//         if (rawRssi === 0) return -100; // Specific mapping for 0 raw RSSI
//         return -(100 - rawRssi); // General conversion formula
//     };

//     // 8. Parse values based on sensor type and protocol documentation
//     try {
//         if (sensorType === "air_quality") {
//             // Air Quality + Noise + Ultrasonic depth sensor protocol (16098522754E)
//             parsedValues.temperature = parse4ByteHex() / 10.0; // Temperature in 0.1°C
//             parsedValues.humidity = parse4ByteHex() / 10.0;    // Humidity in 0.1%RH
//             parsedValues.pm2_5 = parse4ByteHex();              // PM2.5 in ug/m3
//             parsedValues.pm10 = parse4ByteHex();               // PM10 in ug/m3
//             parsedValues.noise = parse4ByteHex() / 10.0;       // Noise in 0.1dB
//             parsedValues.ultrasonic_liquid_level = parse4ByteHex() / 1000.0; // Ultrasonic in mm -> m
//             parsedValues.signal_rssi_raw = parse4ByteHex();    // RSSI raw value
//             parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw);
//             parsedValues.error_code = parse4ByteHex();         // Error code
//             parsedValues.version = parse4ByteHex() / 10.0;     // Version (redundant with header version, but from payload)
//         } else if (sensorType === "weather") {
//             // Weather station sensor protocol (124A7DA90849)
//             parsedValues.temperature = parse4ByteHex() / 10.0;      // Temperature in 0.1°C
//             parsedValues.humidity = parse4ByteHex() / 10.0;         // Humidity in 0.1%RH
//             parsedValues.atmospheric_pressure = parse4ByteHex() / 100.0; // Pressure in 0.01mbar
//             parsedValues.pm2_5 = parse4ByteHex();                       // PM2.5 in ug/m3
//             parsedValues.pm10 = parse4ByteHex();                        // PM10 in ug/m3
//             parsedValues.wind_speed = parse4ByteHex() / 10.0;       // Wind speed in 0.1m/s
//             parsedValues.wind_direction = parse4ByteHex();              // Wind direction in degrees
//             parsedValues.rainfall = parse4ByteHex() / 10.0;         // Rainfall in 0.1mm
//             parsedValues.total_solar_radiation = parse4ByteHex();       // Solar radiation in W/m²
//             parsedValues.signal_rssi_raw = parse4ByteHex();             // RSSI raw value
//             parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw);
//             parsedValues.error_code = parse4ByteHex();                  // Error code
//             parsedValues.version = parse4ByteHex() / 10.0;              // Version (redundant)
//         } else {
//             // Generic fallback parsing (if sensorType is 'unknown' or not explicitly handled)
//             console.warn(`[PARSER] Using generic parsing for unknown sensor: ${sensorIdHex}. Some fields might be null.`);
//             parsedValues.temperature = parse4ByteHex() / 10.0;
//             parsedValues.humidity = parse4ByteHex() / 10.0;
//             parsedValues.signal_rssi_raw = parse4ByteHex();
//             parsedValues.signal_rssi_dbm = convertRssiToDbm(parsedValues.signal_rssi_raw);
//             parsedValues.error_code = parse4ByteHex();
//             parsedValues.version = parse4ByteHex() / 10.0;
//         }
//     } catch (e) {
//         console.error(`[PARSER] Error during data payload parsing: ${e.message}. Incomplete data?`, e);
//         return null; // Return null if parsing of the data payload fails
//     }

//     // 9. Basic Validation: Ensure at least some core data was parsed
//     if (Object.keys(parsedValues).length === 0 || (parsedValues.temperature == null && parsedValues.humidity == null && parsedValues.pm2_5 == null)) {
//         console.warn(`[PARSER] No meaningful sensor data parsed for hex: ${cleanHex}`);
//         return null;
//     }

//     // 10. Return the structured parsed data
//     const finalParsedData = {
//         deviceId: sensorIdHex, // This is the serial number string from the payload
//         sensorId: sensorIdHex, // Also store as sensorId for consistency with schema
//         sessionId: sessionIdDecimal,
//         sensorType,
//         timestamp: timestamp || new Date(), // Use extracted timestamp or current time
//         ...parsedValues, // Spread all parsed sensor values
//         raw_payload_hex: cleanHex, // Store the clean, uppercase hex for auditing
//         raw_sensor_id_hex: sensorIdHex,
//         raw_session_id_hex: sessionIdHex,
//     };

//     console.log(`[PARSER] Successfully parsed ${sensorType} data for device ${sensorIdHex}.`);
//     return finalParsedData;
// }

// module.exports = parseSensorHexString;





// // backend/utils/sensorParser.js

// /**
//  * Enhanced IoT sensor hex string parser with comprehensive error handling
//  * and validation. Supports multiple sensor types and protocols.
//  */

// const PROTOCOL_CONFIG = {
//   HEADER: "FEDC",
//   MIN_LENGTH: 32, // Minimum hex chars for valid protocol
//   MAX_LENGTH: 2048, // Maximum hex chars to prevent memory issues
//   SENSOR_TYPES: {
//     "16098522754E": "air_quality",
//     "124A7DA90849": "weather",
//     // Add more sensor mappings here
//   },
// }

// /**
//  * Enhanced sensor data parser with validation and error handling
//  * @param {string} rawLine - Raw hex string or log line
//  * @param {Date|string} logTimestamp - Optional timestamp from log
//  * @returns {object|null} Parsed sensor data or null if parsing fails
//  */
// function parseSensorHexString(rawLine, logTimestamp = null) {
//   const parseStartTime = Date.now()

//   try {
//     // Input validation
//     if (!rawLine || typeof rawLine !== "string") {
//       console.warn("[PARSER] Invalid input: rawLine must be a non-empty string")
//       return null
//     }

//     if (rawLine.length > PROTOCOL_CONFIG.MAX_LENGTH) {
//       console.warn(`[PARSER] Input too long: ${rawLine.length} chars (max: ${PROTOCOL_CONFIG.MAX_LENGTH})`)
//       return null
//     }

//     // Extract timestamp from log line if present
//     let timestamp = null
//     if (logTimestamp) {
//       timestamp = new Date(logTimestamp)
//     } else {
//       const tsMatch = rawLine.match(/^(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/)
//       if (tsMatch) {
//         try {
//           timestamp = new Date(tsMatch[1])
//           if (isNaN(timestamp.getTime())) {
//             timestamp = null
//           }
//         } catch (e) {
//           console.warn(`[PARSER] Invalid timestamp format: ${tsMatch[1]}`)
//         }
//       }
//     }

//     // Extract and clean hex string
//     const hexMatch = rawLine.match(/([A-Fa-f0-9]{2}(?:[\s:]?[A-Fa-f0-9]{2}){19,})/)
//     if (!hexMatch) {
//       console.warn("[PARSER] No valid hex sequence found in input")
//       return null
//     }

//     const cleanHex = hexMatch[0].replace(/[\s:]/g, "").toUpperCase()

//     // Validate hex string format
//     if (!/^[0-9A-F]+$/.test(cleanHex)) {
//       console.warn("[PARSER] Invalid hex characters found")
//       return null
//     }

//     // Length validation
//     if (cleanHex.length < PROTOCOL_CONFIG.MIN_LENGTH) {
//       console.warn(`[PARSER] Hex string too short: ${cleanHex.length} chars (min: ${PROTOCOL_CONFIG.MIN_LENGTH})`)
//       return null
//     }

//     // Header validation
//     const header = cleanHex.substring(0, 4)
//     if (header !== PROTOCOL_CONFIG.HEADER) {
//       console.warn(`[PARSER] Invalid header: '${header}' (expected: '${PROTOCOL_CONFIG.HEADER}')`)
//       return null
//     }

//     // Parse fixed protocol fields with bounds checking
//     const protocolFields = extractProtocolFields(cleanHex)
//     if (!protocolFields) {
//       return null
//     }

//     // Determine sensor type
//     const sensorType = PROTOCOL_CONFIG.SENSOR_TYPES[protocolFields.sensorIdHex] || "unknown"

//     console.log(`[PARSER] Processing ${sensorType} sensor: ${protocolFields.sensorIdHex}`)

//     // Parse variable data payload
//     const sensorData = parseVariableData(cleanHex, sensorType, protocolFields)
//     if (!sensorData) {
//       return null
//     }

//     // Construct final result
//     const result = {
//       deviceId: protocolFields.sensorIdHex,
//       sensorId: protocolFields.sensorIdHex,
//       sessionId: protocolFields.sessionId,
//       sensorType,
//       timestamp: timestamp || new Date(),
//       version: protocolFields.version,
//       raw_payload_hex: cleanHex,
//       raw_sensor_id_hex: protocolFields.sensorIdHex,
//       raw_session_id_hex: protocolFields.sessionIdHex,
//       ...sensorData,
//       // Add parsing metadata
//       metadata: {
//         parseTime: Date.now() - parseStartTime,
//         payloadLength: cleanHex.length,
//         protocolVersion: protocolFields.version,
//       },
//     }

//     // Validate final result
//     if (!validateParsedData(result)) {
//       console.warn("[PARSER] Parsed data failed validation")
//       return null
//     }

//     console.log(`[PARSER] Successfully parsed ${sensorType} data in ${Date.now() - parseStartTime}ms`)
//     return result
//   } catch (error) {
//     console.error(`[PARSER] Unexpected error: ${error.message}`, error)
//     return null
//   }
// }

// /**
//  * Extract and validate fixed protocol fields
//  */
// function extractProtocolFields(cleanHex) {
//   try {
//     if (cleanHex.length < 32) {
//       console.warn("[PARSER] Insufficient data for protocol fields")
//       return null
//     }

//     const versionHex = cleanHex.substring(4, 6)
//     const sensorIdHex = cleanHex.substring(6, 18)
//     const sessionIdHex = cleanHex.substring(18, 26)
//     const orderHex = cleanHex.substring(26, 28)
//     const lengthHex = cleanHex.substring(28, 32)

//     // Validate hex field formats
//     if (
//       !/^[0-9A-F]{2}$/.test(versionHex) ||
//       !/^[0-9A-F]{12}$/.test(sensorIdHex) ||
//       !/^[0-9A-F]{8}$/.test(sessionIdHex) ||
//       !/^[0-9A-F]{2}$/.test(orderHex) ||
//       !/^[0-9A-F]{4}$/.test(lengthHex)
//     ) {
//       console.warn("[PARSER] Invalid protocol field format")
//       return null
//     }

//     // Parse numeric values
//     const version = Number.parseInt(versionHex, 16) / 10.0
//     const sessionId = Number.parseInt(sessionIdHex, 16)
//     const dataLength = Number.parseInt(lengthHex, 16)

//     // Validate ranges
//     if (version < 0 || version > 25.5) {
//       console.warn(`[PARSER] Invalid version: ${version}`)
//       return null
//     }

//     if (sessionId < 0 || sessionId > 4294967295) {
//       console.warn(`[PARSER] Invalid session ID: ${sessionId}`)
//       return null
//     }

//     if (dataLength < 0 || dataLength > 1024) {
//       console.warn(`[PARSER] Invalid data length: ${dataLength}`)
//       return null
//     }

//     // Check if we have enough data for the specified payload length
//     const expectedTotalLength = 32 + dataLength * 2
//     if (cleanHex.length < expectedTotalLength) {
//       console.warn(`[PARSER] Insufficient payload data: expected ${expectedTotalLength}, got ${cleanHex.length}`)
//       return null
//     }

//     return {
//       versionHex,
//       sensorIdHex,
//       sessionIdHex,
//       orderHex,
//       lengthHex,
//       version,
//       sessionId,
//       dataLength,
//     }
//   } catch (error) {
//     console.error(`[PARSER] Error extracting protocol fields: ${error.message}`)
//     return null
//   }
// }

// /**
//  * Parse variable sensor data based on sensor type
//  */
// function parseVariableData(cleanHex, sensorType, protocolFields) {
//   try {
//     let currentIndex = 32 // Start after fixed header
//     const parsedValues = {}

//     // Helper function to safely parse 4-byte hex values
//     const parse4ByteHex = () => {
//       if (currentIndex + 8 > cleanHex.length) {
//         console.warn(`[PARSER] Insufficient data at index ${currentIndex}`)
//         return null
//       }

//       const hexVal = cleanHex.substring(currentIndex, currentIndex + 8)
//       currentIndex += 8

//       try {
//         const value = Number.parseInt(hexVal, 16)
//         // Handle signed 32-bit integers if needed
//         return value > 2147483647 ? value - 4294967296 : value
//       } catch (e) {
//         console.warn(`[PARSER] Invalid hex value: ${hexVal}`)
//         return null
//       }
//     }

//     // Enhanced RSSI conversion with validation
//     const convertRssiToDbm = (rawRssi) => {
//       if (rawRssi === null || rawRssi === undefined) return null
//       if (rawRssi < 0 || rawRssi > 100) return null // Validate range
//       if (rawRssi === 0) return -100
//       return Math.max(-100, Math.min(0, -(100 - rawRssi)))
//     }

//     // Parse based on sensor type with enhanced validation
//     switch (sensorType) {
//       case "air_quality":
//         parsedValues.temperature = safeDivide(parse4ByteHex(), 10.0, -50, 100)
//         parsedValues.humidity = safeDivide(parse4ByteHex(), 10.0, 0, 100)
//         parsedValues.pm2_5 = validateRange(parse4ByteHex(), 0, 1000)
//         parsedValues.pm10 = validateRange(parse4ByteHex(), 0, 1000)
//         parsedValues.noise = safeDivide(parse4ByteHex(), 10.0, 0, 200)
//         parsedValues.ultrasonic_liquid_level = safeDivide(parse4ByteHex(), 1000.0, 0, 10)

//         const rawRssiAir = parse4ByteHex()
//         parsedValues.signal_rssi_raw = validateRange(rawRssiAir, 0, 100)
//         parsedValues.signal_rssi_dbm = convertRssiToDbm(rawRssiAir)
//         parsedValues.error_code = validateRange(parse4ByteHex(), 0, 65535)
//         break

//       case "weather":
//         parsedValues.temperature = safeDivide(parse4ByteHex(), 10.0, -50, 100)
//         parsedValues.humidity = safeDivide(parse4ByteHex(), 10.0, 0, 100)
//         parsedValues.atmospheric_pressure = safeDivide(parse4ByteHex(), 100.0, 800, 1200)
//         parsedValues.pm2_5 = validateRange(parse4ByteHex(), 0, 1000)
//         parsedValues.pm10 = validateRange(parse4ByteHex(), 0, 1000)
//         parsedValues.wind_speed = safeDivide(parse4ByteHex(), 10.0, 0, 100)
//         parsedValues.wind_direction = validateRange(parse4ByteHex(), 0, 360)
//         parsedValues.rainfall = safeDivide(parse4ByteHex(), 10.0, 0, 1000)
//         parsedValues.total_solar_radiation = validateRange(parse4ByteHex(), 0, 2000)

//         const rawRssiWeather = parse4ByteHex()
//         parsedValues.signal_rssi_raw = validateRange(rawRssiWeather, 0, 100)
//         parsedValues.signal_rssi_dbm = convertRssiToDbm(rawRssiWeather)
//         parsedValues.error_code = validateRange(parse4ByteHex(), 0, 65535)
//         break

//       default:
//         console.warn(`[PARSER] Using generic parsing for sensor type: ${sensorType}`)
//         parsedValues.temperature = safeDivide(parse4ByteHex(), 10.0, -50, 100)
//         parsedValues.humidity = safeDivide(parse4ByteHex(), 10.0, 0, 100)

//         const rawRssiGeneric = parse4ByteHex()
//         parsedValues.signal_rssi_raw = validateRange(rawRssiGeneric, 0, 100)
//         parsedValues.signal_rssi_dbm = convertRssiToDbm(rawRssiGeneric)
//         parsedValues.error_code = validateRange(parse4ByteHex(), 0, 65535)
//         break
//     }

//     return parsedValues
//   } catch (error) {
//     console.error(`[PARSER] Error parsing variable data: ${error.message}`)
//     return null
//   }
// }

// /**
//  * Safely divide with range validation
//  */
// function safeDivide(numerator, denominator, min = null, max = null) {
//   if (numerator === null || numerator === undefined || denominator === 0) {
//     return null
//   }

//   const result = numerator / denominator

//   if (min !== null && result < min) return null
//   if (max !== null && result > max) return null

//   return Math.round(result * 100) / 100 // Round to 2 decimal places
// }

// /**
//  * Validate numeric range
//  */
// function validateRange(value, min, max) {
//   if (value === null || value === undefined) return null
//   if (value < min || value > max) return null
//   return value
// }

// /**
//  * Validate the final parsed data structure
//  */
// function validateParsedData(data) {
//   try {
//     // Check required fields
//     if (!data.deviceId || !data.sensorId || !data.sensorType) {
//       console.warn("[PARSER] Missing required fields")
//       return false
//     }

//     // Check deviceId format (12 hex chars)
//     if (!/^[0-9A-F]{12}$/.test(data.deviceId)) {
//       console.warn(`[PARSER] Invalid deviceId format: ${data.deviceId}`)
//       return false
//     }

//     // Check timestamp
//     if (!data.timestamp || isNaN(data.timestamp.getTime())) {
//       console.warn("[PARSER] Invalid timestamp")
//       return false
//     }

//     // Check if we have at least some sensor data
//     const hasData =
//       data.temperature !== null ||
//       data.humidity !== null ||
//       data.pm2_5 !== null ||
//       data.pm10 !== null ||
//       data.noise !== null ||
//       data.ultrasonic_liquid_level !== null ||
//       data.wind_speed !== null ||
//       data.atmospheric_pressure !== null

//     if (!hasData) {
//       console.warn("[PARSER] No meaningful sensor data found")
//       return false
//     }

//     return true
//   } catch (error) {
//     console.error(`[PARSER] Validation error: ${error.message}`)
//     return false
//   }
// }

// module.exports = parseSensorHexString




// backend/utils/sensorParser.js

/**
 * Enhanced IoT sensor hex string parser with comprehensive error handling
 * and validation. Supports multiple sensor types and protocols.
 */

const PROTOCOL_CONFIG = {
  HEADER: "FEDC",
  MIN_LENGTH: 32, // Minimum hex chars for valid protocol (fixed header only)
  MAX_LENGTH: 2048, // Maximum hex chars to prevent memory issues
  SENSOR_TYPES: {
    "16098522754E": "air_quality",
    "124A7DA90849": "weather",
    // Add more sensor mappings here
  },
}

/**
 * Enhanced sensor data parser with validation and error handling
 * @param {string} rawLine - Raw hex string or log line
 * @param {Date|string} logTimestamp - Optional timestamp from log (used if rawLine is a log line)
 * @returns {object|null} Parsed sensor data or null if parsing fails
 */
function parseSensorHexString(rawLine, logTimestamp = null) {
  const parseStartTime = Date.now()

  try {
    // Input validation
    if (!rawLine || typeof rawLine !== "string") {
      console.warn("[PARSER] Invalid input: rawLine must be a non-empty string")
      return null
    }

    let cleanHex = rawLine.toUpperCase();
    let timestamp = null;

    // Check if rawLine contains a timestamp prefix (like a log line)
    const tsMatch = rawLine.match(/^(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\s+([A-Fa-f0-9]+)$/);
    if (tsMatch) {
      try {
        timestamp = new Date(tsMatch[1]);
        if (isNaN(timestamp.getTime())) {
          timestamp = null; // Invalid timestamp in log line
        }
        cleanHex = tsMatch[2].toUpperCase(); // Extract hex part from log line
      } catch (e) {
        console.warn(`[PARSER] Invalid timestamp format in log line: ${tsMatch[1]}`);
        timestamp = null;
      }
    } else if (logTimestamp) {
      // If logTimestamp is explicitly provided, use it
      try {
        timestamp = new Date(logTimestamp);
        if (isNaN(timestamp.getTime())) {
          timestamp = null;
        }
      } catch (e) {
        console.warn(`[PARSER] Invalid logTimestamp provided: ${logTimestamp}`);
        timestamp = null;
      }
    }

    // Remove any non-hex characters (spaces, colons) that might have been included
    cleanHex = cleanHex.replace(/[\s:]/g, "");

    // Validate hex string format
    if (!/^[0-9A-F]+$/.test(cleanHex)) {
      console.warn("[PARSER] Invalid hex characters found after cleaning")
      return null
    }

    // Length validation
    if (cleanHex.length < PROTOCOL_CONFIG.MIN_LENGTH) {
      console.warn(`[PARSER] Hex string too short: ${cleanHex.length} chars (min: ${PROTOCOL_CONFIG.MIN_LENGTH})`)
      return null
    }
    if (cleanHex.length > PROTOCOL_CONFIG.MAX_LENGTH) {
      console.warn(`[PARSER] Hex string too long: ${cleanHex.length} chars (max: ${PROTOCOL_CONFIG.MAX_LENGTH})`)
      return null
    }

    // Header validation
    const header = cleanHex.substring(0, 4)
    if (header !== PROTOCOL_CONFIG.HEADER) {
      console.warn(`[PARSER] Invalid header: '${header}' (expected: '${PROTOCOL_CONFIG.HEADER}')`)
      return null
    }

    // Parse fixed protocol fields with bounds checking
    const protocolFields = extractProtocolFields(cleanHex)
    if (!protocolFields) {
      return null
    }

    // Determine sensor type
    const sensorType = PROTOCOL_CONFIG.SENSOR_TYPES[protocolFields.sensorIdHex] || "unknown"

    console.log(`[PARSER] Processing ${sensorType} sensor: ${protocolFields.sensorIdHex}`)

    // Parse variable data payload
    const sensorData = parseVariableData(cleanHex, sensorType, protocolFields)
    if (!sensorData) {
      return null
    }

    // Construct final result
    const result = {
      deviceId: protocolFields.sensorIdHex,
      sensorId: protocolFields.sensorIdHex,
      sessionId: protocolFields.sessionId,
      sensorType,
      timestamp: timestamp || new Date(), // Use provided timestamp or current date
      version: protocolFields.version,
      raw_payload_hex: cleanHex,
      raw_sensor_id_hex: protocolFields.sensorIdHex,
      raw_session_id_hex: protocolFields.sessionIdHex,
      ...sensorData,
      // Add parsing metadata
      metadata: {
        parseTime: Date.now() - parseStartTime,
        payloadLength: cleanHex.length,
        protocolVersion: protocolFields.version,
      },
    }

    // Validate final result
    if (!validateParsedData(result)) {
      console.warn("[PARSER] Parsed data failed final validation")
      return null
    }

    console.log(`[PARSER] Successfully parsed ${sensorType} data in ${Date.now() - parseStartTime}ms`)
    return result
  } catch (error) {
    console.error(`[PARSER] Unexpected error: ${error.message}`, error)
    return null
  }
}

/**
 * Extract and validate fixed protocol fields
 */
function extractProtocolFields(cleanHex) {
  try {
    if (cleanHex.length < 32) {
      console.warn("[PARSER] Insufficient data for protocol fields (min 32 hex chars for header)")
      return null
    }

    const versionHex = cleanHex.substring(4, 6)
    const sensorIdHex = cleanHex.substring(6, 18)
    const sessionIdHex = cleanHex.substring(18, 26)
    const orderHex = cleanHex.substring(26, 28)
    const lengthHex = cleanHex.substring(28, 32) // Payload length in bytes

    // --- ADD THESE DEBUG LOGS ---
    console.log(`[PARSER-DEBUG] lengthHex from string: '${lengthHex}'`);
    // --- END DEBUG LOGS ---

    // Validate hex field formats
    if (
      !/^[0-9A-F]{2}$/.test(versionHex) ||
      !/^[0-9A-F]{12}$/.test(sensorIdHex) ||
      !/^[0-9A-F]{8}$/.test(sessionIdHex) ||
      !/^[0-9A-F]{2}$/.test(orderHex) ||
      !/^[0-9A-F]{4}$/.test(lengthHex)
    ) {
      console.warn("[PARSER] Invalid protocol field format in header parts")
      return null
    }

    // Parse numeric values
    const version = Number.parseInt(versionHex, 16) / 10.0
    const sessionId = Number.parseInt(sessionIdHex, 16)
    const dataLength = Number.parseInt(lengthHex, 16) // This is payload length in BYTES

    // --- ADD THESE DEBUG LOGS ---
    console.log(`[PARSER-DEBUG] Parsed dataLength (decimal): ${dataLength}`);
    // --- END DEBUG LOGS ---

    // Validate ranges
    if (version < 0 || version > 25.5) {
      console.warn(`[PARSER] Invalid version: ${version}`)
      return null
    }

    if (sessionId < 0 || sessionId > 4294967295) {
      console.warn(`[PARSER] Invalid session ID: ${sessionId}`)
      return null
    }

    // Validate dataLength (payload bytes)
    // Max payload length in bytes (2048 hex chars / 2 = 1024 bytes)
    if (dataLength < 0 || dataLength > 1024) {
      console.warn(`[PARSER] Invalid declared payload length: ${dataLength} bytes (max: 1024)`)
      return null
    }

    // Check if we have enough data for the specified payload length
    // Total expected hex chars = 32 (fixed header) + dataLength (bytes) * 2 (hex chars per byte)
    const expectedTotalLength = 32 + dataLength * 2
    if (cleanHex.length < expectedTotalLength) {
      console.warn(`[PARSER] Incomplete payload data: expected total hex length ${expectedTotalLength}, got ${cleanHex.length}`)
      return null
    }

    return {
      versionHex,
      sensorIdHex,
      sessionIdHex,
      orderHex,
      lengthHex,
      version,
      sessionId,
      dataLength, // Payload length in bytes
    }
  } catch (error) {
    console.error(`[PARSER] Error extracting protocol fields: ${error.message}`)
    return null
  }
}

/**
 * Parse variable sensor data based on sensor type
 */
function parseVariableData(cleanHex, sensorType, protocolFields) {
  try {
    let currentIndex = 32 // Start after fixed header (32 hex chars)
    const parsedValues = {}

    // Helper function to safely parse 4-byte hex values (8 hex chars)
    const parse4ByteHex = () => {
      // Check if there are enough characters left in the cleanHex string
      if (currentIndex + 8 > cleanHex.length) {
        console.warn(`[PARSER] Insufficient data for 4-byte hex value at index ${currentIndex}. Remaining: ${cleanHex.length - currentIndex}`)
        return null
      }

      const hexVal = cleanHex.substring(currentIndex, currentIndex + 8)
      currentIndex += 8

      try {
        const value = Number.parseInt(hexVal, 16)
        // Handle signed 32-bit integers (if the value is interpreted as signed)
        // Max signed 32-bit int is 2^31 - 1 = 2147483647
        // If value is greater than this, it's a negative number in 2's complement
        return value > 2147483647 ? value - 4294967296 : value
      } catch (e) {
        console.warn(`[PARSER] Invalid hex value for 4-byte parse: ${hexVal}. Error: ${e.message}`)
        return null
      }
    }

    // Enhanced RSSI conversion with validation
    const convertRssiToDbm = (rawRssi) => {
      if (rawRssi === null || rawRssi === undefined) return null
      if (rawRssi < 0 || rawRssi > 100) {
        console.warn(`[PARSER] Raw RSSI out of expected range (0-100): ${rawRssi}`)
        return null // Validate range
      }
      if (rawRssi === 0) return -100
      return Math.max(-100, Math.min(0, -(100 - rawRssi)))
    }

    // Parse based on sensor type with enhanced validation
    switch (sensorType) {
      case "air_quality":
        // Order of parameters MUST match Java's SensorDataParser
        parsedValues.temperature = safeDivide(parse4ByteHex(), 10.0, -50, 100)
        parsedValues.humidity = safeDivide(parse4ByteHex(), 10.0, 0, 100)
        parsedValues.pm2_5 = validateRange(parse4ByteHex(), 0, 1000)
        parsedValues.pm10 = validateRange(parse4ByteHex(), 0, 1000)
        parsedValues.noise = safeDivide(parse4ByteHex(), 10.0, 0, 200)
        parsedValues.ultrasonic_liquid_level = safeDivide(parse4ByteHex(), 1000.0, 0, 10)

        const rawRssiAir = parse4ByteHex()
        parsedValues.signal_rssi_raw = validateRange(rawRssiAir, 0, 100)
        parsedValues.signal_rssi_dbm = convertRssiToDbm(rawRssiAir)
        parsedValues.error_code = validateRange(parse4ByteHex(), 0, 65535)
        break

      case "weather":
        // Order of parameters MUST match Java's SensorDataParser
        parsedValues.temperature = safeDivide(parse4ByteHex(), 10.0, -50, 100)
        parsedValues.humidity = safeDivide(parse4ByteHex(), 10.0, 0, 100)
        parsedValues.atmospheric_pressure = safeDivide(parse4ByteHex(), 100.0, 800, 1200)
        parsedValues.pm2_5 = validateRange(parse4ByteHex(), 0, 1000)
        parsedValues.pm10 = validateRange(parse4ByteHex(), 0, 1000)
        parsedValues.wind_speed = safeDivide(parse4ByteHex(), 10.0, 0, 100)
        parsedValues.wind_direction = validateRange(parse4ByteHex(), 0, 360)
        parsedValues.rainfall = safeDivide(parse4ByteHex(), 10.0, 0, 1000)
        parsedValues.total_solar_radiation = validateRange(parse4ByteHex(), 0, 2000)

        const rawRssiWeather = parse4ByteHex()
        parsedValues.signal_rssi_raw = validateRange(rawRssiWeather, 0, 100)
        parsedValues.signal_rssi_dbm = convertRssiToDbm(rawRssiWeather)
        parsedValues.error_code = validateRange(parse4ByteHex(), 0, 65535)
        break

      default:
        console.warn(`[PARSER] Using generic parsing for sensor type: ${sensorType}`)
        // Generic parsing should still attempt to read the expected number of bytes
        // based on the payloadLength from protocolFields, even if it doesn't know the meaning.
        // For now, mirroring the few fields from air_quality/weather.
        parsedValues.temperature = safeDivide(parse4ByteHex(), 10.0, -50, 100)
        parsedValues.humidity = safeDivide(parse4ByteHex(), 10.0, 0, 100)

        const rawRssiGeneric = parse4ByteHex()
        parsedValues.signal_rssi_raw = validateRange(rawRssiGeneric, 0, 100)
        parsedValues.signal_rssi_dbm = convertRssiToDbm(rawRssiGeneric)
        parsedValues.error_code = validateRange(parse4ByteHex(), 0, 65535)
        break
    }

    // After parsing, check if currentIndex matches the expected end of the payload
    const expectedPayloadEndIndex = 32 + protocolFields.dataLength * 2;
    if (currentIndex !== expectedPayloadEndIndex) {
        console.warn(`[PARSER] Payload parsing mismatch: Expected to read ${protocolFields.dataLength * 2} hex chars, but read ${currentIndex - 32}. Remaining unparsed data: ${cleanHex.substring(currentIndex)}`);
        // Decide if this should be a hard error or just a warning.
        // For now, we'll allow it to proceed if some data was parsed, but log a warning.
    }


    return parsedValues
  } catch (error) {
    console.error(`[PARSER] Error parsing variable data: ${error.message}`)
    return null
  }
}

/**
 * Safely divide with range validation
 */
function safeDivide(numerator, denominator, min = null, max = null) {
  if (numerator === null || numerator === undefined || denominator === 0) {
    return null
  }

  const result = numerator / denominator

  if (min !== null && result < min) {
    console.warn(`[PARSER] Value ${result} below min ${min}. Returning null.`);
    return null;
  }
  if (max !== null && result > max) {
    console.warn(`[PARSER] Value ${result} above max ${max}. Returning null.`);
    return null;
  }

  return Math.round(result * 100) / 100 // Round to 2 decimal places
}

/**
 * Validate numeric range
 */
function validateRange(value, min, max) {
  if (value === null || value === undefined) return null
  if (value < min || value > max) {
    console.warn(`[PARSER] Value ${value} out of range [${min}, ${max}]. Returning null.`);
    return null;
  }
  return value
}

/**
 * Validate the final parsed data structure
 */
function validateParsedData(data) {
  try {
    // Check required fields
    if (!data.deviceId || !data.sensorId || !data.sensorType) {
      console.warn("[PARSER] Missing required fields (deviceId, sensorId, sensorType)")
      return false
    }

    // Check deviceId format (12 hex chars)
    if (!/^[0-9A-F]{12}$/.test(data.deviceId)) {
      console.warn(`[PARSER] Invalid deviceId format: ${data.deviceId}`)
      return false
    }

    // Check timestamp
    if (!data.timestamp || isNaN(data.timestamp.getTime())) {
      console.warn("[PARSER] Invalid timestamp")
      return false
    }

    // Check if we have at least some sensor data
    const hasData =
      data.temperature !== null ||
      data.humidity !== null ||
      data.pm2_5 !== null ||
      data.pm10 !== null ||
      data.noise !== null ||
      data.ultrasonic_liquid_level !== null ||
      data.wind_speed !== null ||
      data.atmospheric_pressure !== null ||
      data.signal_rssi_dbm !== null || // Added RSSI to check for meaningful data
      data.battery_level !== null ||
      data.error_code !== null

    if (!hasData) {
      console.warn("[PARSER] No meaningful sensor data found after parsing. All values are null.")
      return false
    }

    return true
  } catch (error) {
    console.error(`[PARSER] Final validation error: ${error.message}`)
    return false
  }
}

module.exports = parseSensorHexString
