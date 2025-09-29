// process_sensor_logs.js

const fs = require('fs');
const readline = require('readline');

// --- START: parseSensorHexString function (copied from previous responses) ---
// This function takes the raw hex string and parses it according to your sensor protocol.
function parseSensorHexString(rawHexString, logTimestamp) {
    const cleanHex = rawHexString.replace(/\s/g, '');

    const header = cleanHex.substring(0, 4);
    if (header.toUpperCase() !== 'FEDC') {
        // console.warn('Skipping line: Invalid header:', header);
        return null;
    }

    const sensorIdHex = cleanHex.substring(6, 18);
    const sessionIdHex = cleanHex.substring(18, 26);
    const payloadLengthHex = cleanHex.substring(28, 32);

    let sensorType = 'UNKNOWN';
    if (sensorIdHex.toUpperCase() === '16098522754E') {
        sensorType = 'AIR_QUALITY_ULTRASONIC';
    } else if (sensorIdHex.toUpperCase() === '124A7DA90849') {
        sensorType = 'WEATHER_STATION';
    } else {
        // console.warn('Skipping line: Unknown Sensor ID:', sensorIdHex);
        return null;
    }

    let parsedValues = {};
    let currentIndex = 32; // Start of sensor data payload

    if (sensorType === 'AIR_QUALITY_ULTRASONIC') {
        parsedValues.temperature = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 10.0; currentIndex += 8;
        parsedValues.humidity = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 10.0; currentIndex += 8;
        parsedValues.pm2_5 = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.pm10 = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.noise = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 10.0; currentIndex += 8;
        parsedValues.ultrasonic_liquid_level = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.signal_rssi_raw = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.signal_rssi_dbm = -(100 - parsedValues.signal_rssi_raw); // Example conversion
        parsedValues.error_code = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.version = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 10.0; currentIndex += 8;

    } else if (sensorType === 'WEATHER_STATION') {
        parsedValues.temperature = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 10.0; currentIndex += 8;
        parsedValues.humidity = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 10.0; currentIndex += 8;
        parsedValues.atmospheric_pressure = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 100.0; currentIndex += 8;
        parsedValues.pm2_5 = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.pm10 = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.wind_speed = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 10.0; currentIndex += 8;
        parsedValues.wind_direction = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.rainfall = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.total_solar_radiation = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.signal_rssi_raw = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.signal_rssi_dbm = -(100 - parsedValues.signal_rssi_raw); // Example conversion
        parsedValues.error_code = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16); currentIndex += 8;
        parsedValues.version = parseInt(cleanHex.substring(currentIndex, currentIndex + 8), 16) / 10.0; currentIndex += 8;
    }

    return {
        sensorId: sensorIdHex,
        sensorType: sensorType,
        timestamp: new Date(logTimestamp),
        sessionId: sessionIdHex,
        ...parsedValues,
        raw_payload_hex: rawHexString
    };
}
// --- END: parseSensorHexString function ---


const logFilePath = 'sensor_logs.log';
const processedData = []; // To store all parsed objects

async function processLogFile() {
    console.log(`Starting to process log file: ${logFilePath}`);
    const fileStream = fs.createReadStream(logFilePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity // Recognizes both LF and CRLF as line breaks
    });

    let lineNumber = 0;
    for await (const line of rl) {
        lineNumber++;
        // console.log(`Processing line ${lineNumber}: ${line}`); // Uncomment for verbose logging

        // Step 1: Extract Timestamp and Raw Hex String from the log line
        const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/);
        const logTimestamp = timestampMatch ? timestampMatch[1] : null;

        const hexDataStartIndex = line.indexOf("Bytes in Hex: ");
        let rawHexString = null;

        if (logTimestamp && hexDataStartIndex !== -1) {
            rawHexString = line.substring(hexDataStartIndex + "Bytes in Hex: ".length);
        }

        if (rawHexString) {
            // Step 2: Parse and Decode the Raw Hex String
            const parsedSensorData = parseSensorHexString(rawHexString, logTimestamp);

            if (parsedSensorData) {
                processedData.push(parsedSensorData);
                console.log(`Line ${lineNumber} processed successfully. Sensor: ${parsedSensorData.sensorType}, Temp: ${parsedSensorData.temperature}`);
                // console.log(JSON.stringify(parsedSensorData, null, 2)); // Uncomment to see each parsed object
            } else {
                console.warn(`Line ${lineNumber}: Could not parse valid sensor data from hex string.`);
            }
        } else {
            console.log(`Line ${lineNumber}: Skipped (does not contain sensor data or timestamp).`);
        }
    }

    console.log(`\nFinished processing ${lineNumber} lines.`);
    console.log(`Successfully parsed ${processedData.length} sensor data entries.`);

    // --- Step 3: Demonstrate readiness for MongoDB insertion ---
    // At this point, the 'processedData' array contains all your structured sensor readings.
    // In a real Express application, you would now iterate through this array
    // and save each item to your MongoDB collection using Mongoose.

    if (processedData.length > 0) {
        console.log("\n--- Sample of Processed Data (first 2 entries) ---");
        console.log(JSON.stringify(processedData.slice(0, 2), null, 2));
        console.log("\nThis 'processedData' array is ready for bulk insertion into MongoDB.");
    } else {
        console.log("No valid sensor data was processed from the file.");
    }
}

// Run the processing function
processLogFile().catch(console.error);