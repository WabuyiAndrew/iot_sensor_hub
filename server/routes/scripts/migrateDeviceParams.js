// backend/scripts/migrateDeviceParams.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path'); // Import the path module
const Device = require('../models/device'); // Adjust path if your models directory is different

// Load environment variables from .env file
// Using path.join and __dirname to ensure absolute path resolution
const envPath = path.resolve(__dirname, '..', '.env');
console.log("DEBUG: Attempting to load .env from:", envPath); // Add this for debugging

dotenv.config({ path: envPath }); 

// FIX: Changed from MONGO_URI to MONGODB_URI to match your .env file
const DB_URI = process.env.MONGODB_URI; 

// Define the standard parameters for your "AIRQUALITY + NOISE + Ultrasonic depth" type devices
const DEFAULT_PARAMETERS_FOR_AIR_NOISE_ULTRASONIC = [
    { name: "temperature", unit: "℃", dataType: "number" },
    { name: "humidity", unit: "%RH", dataType: "number" },
    { name: "pm2_5", unit: "µg/m³", dataType: "number" },
    { name: "pm10", unit: "µg/m³", dataType: "number" },
    { name: "noise", unit: "dB", dataType: "number" },
    { name: "ultrasonic_liquid_level", unit: "m", dataType: "number" },
    { name: "signal_rssi_raw", unit: "RSSI", dataType: "number" },
    { name: "signal_rssi_dbm", unit: "dBm", dataType: "number" },
    { name: "error_code", dataType: "number" },
    { name: "version", unit: "", dataType: "number" }
];

// Define the standard parameters for "Weather Station" type devices
const DEFAULT_PARAMETERS_FOR_WEATHER_STATION = [
    { name: "temperature", unit: "℃", dataType: "number" },
    { name: "humidity", unit: "%RH", dataType: "number" },
    { name: "atmospheric_pressure", unit: "mbar", dataType: "number" },
    { name: "pm2_5", unit: "µg/m³", dataType: "number" },
    { name: "pm10", unit: "µg/m³", dataType: "number" },
    { name: "wind_speed", unit: "m/s", dataType: "number" },
    { name: "wind_direction", unit: "degrees", dataType: "number" },
    { name: "rainfall", unit: "mm", dataType: "number" },
    { name: "total_solar_radiation", unit: "W/㎡", dataType: "number" },
    { name: "signal_rssi_raw", unit: "RSSI", dataType: "number" },
    { name: "signal_rssi_dbm", unit: "dBm", dataType: "number" }, // Converted RSSI
    { name: "error_code", dataType: "number" },
    { name: "version", unit: "", dataType: "number" }
];

// NEW: Define device types for which parameters should ALWAYS be updated,
// even if they already have a 'parameters' array. This helps correct old data.
// Now includes 'Home' since devices of this type are being misconfigured.
const FORCE_UPDATE_TYPES = [
    'Home' // Devices currently have type 'Home'
    // Ensure this EXACTLY matches device.type in DB
    // Add other device types here if you need to force-update their parameters
];


async function migrateDeviceParameters() {
    console.log("Starting device parameters migration script...");

    // Add a check to confirm DB_URI is loaded
    if (!DB_URI) {
        console.error("Error: MONGODB_URI is not defined. Please check your .env file and its path and ensure the variable name is correct (e.g., MONGODB_URI=...).");
        process.exit(1);
    } else {
        console.log("MONGODB_URI successfully loaded (though not displayed for security).");
    }

    try {
        await mongoose.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);

        // Find all devices
        // The filtering for update will happen inside the loop based on type and existing parameters
        const allDevices = await Device.find({});

        if (allDevices.length === 0) {
            console.log("No devices found in the database at all. Nothing to migrate.");
            mongoose.disconnect();
            return;
        }

        console.log(`Found ${allDevices.length} total devices in the database.`);

        let devicesUpdatedCount = 0;

        for (const device of allDevices) {
            let parametersToAssign = [];
            let needsUpdate = false; // Flag to track if an update is actually needed for this device

            console.log(`Evaluating device: ${device.name} (ID: ${device._id}), Type: '${device.type}'`);

            // Assign parameters based on device NAME (as device.type is currently generic 'Home')
            // Using .includes() for flexibility if names are not exact, but contain identifying phrases
            if (device.name.includes('AIRQUALITY') && device.name.includes('NOISE') && device.name.includes('Ultrasonic depth')) {
                parametersToAssign = DEFAULT_PARAMETERS_FOR_AIR_NOISE_ULTRASONIC;
                console.log(`- Matched by name as AIRQUALITY + NOISE + Ultrasonic depth device.`);
            } else if (device.name.includes('Weather station')) {
                parametersToAssign = DEFAULT_PARAMETERS_FOR_WEATHER_STATION;
                console.log(`- Matched by name as Weather Station device.`);
            } else {
                console.log(`- Device name '${device.name}' not recognized for specific parameter assignment. Skipping.`);
                continue; // Skip to the next device if name is not recognized
            }

            // --- Determine if an update is genuinely necessary ---
            // If device type is in FORCE_UPDATE_TYPES (now 'Home'), force update for these.
            // This ensures previously misconfigured 'Home' type devices get corrected.
            if (FORCE_UPDATE_TYPES.includes(device.type)) {
                needsUpdate = true;
                console.log(`- Device type '${device.type}' is in FORCE_UPDATE_TYPES. Forcing update.`);
            } else if (!device.parameters || device.parameters.length === 0) {
                // If parameters are missing or empty, it definitely needs an update
                needsUpdate = true;
                console.log(`- Device parameters missing or empty. Updating.`);
            } else {
                // For other cases, check if the current parameters differ from the desired ones
                const currentParamNames = new Set(device.parameters.map(p => p.name));
                const desiredParamNames = new Set(parametersToAssign.map(p => p.name));

                // Check if sets of parameter names are different (size or content)
                if (currentParamNames.size !== desiredParamNames.size || 
                    ![...desiredParamNames].every(name => currentParamNames.has(name)) ||
                    ![...currentParamNames].every(name => desiredParamNames.has(name))) { // Also check for extra params
                    needsUpdate = true;
                    console.log(`- Existing parameters differ from desired. Updating.`);
                } else {
                    console.log(`- Parameters already match for type '${device.type}'. Skipping update.`);
                }
            }

            if (needsUpdate) {
                console.log(`Updating device: ${device.name} (ID: ${device._id}) with parameters for name match.`);
                device.parameters = parametersToAssign;
                await device.save(); // Save the updated document
                console.log(`- Successfully updated parameters for device: ${device.name}`);
                devicesUpdatedCount++;
            } else {
                console.log(`Skipping device: ${device.name} (ID: ${device._id}). Parameters are already correct or not a type/name for migration.`);
            }
        }

        if (devicesUpdatedCount > 0) {
            console.log(`Device parameters migration completed successfully! Updated ${devicesUpdatedCount} devices.`);
        } else {
            console.log("No devices found that needed parameter migration (or no matching types/names).");
        }


    } catch (error) {
        console.error("Error during device parameters migration:", error);
        process.exit(1); // Exit with an error code
    } finally {
        if (mongoose.connection.readyState === 1) { // Check if connection is still open
            await mongoose.disconnect();
            console.log("MongoDB Disconnected.");
        }
    }
}

// Execute the migration function
migrateDeviceParameters();
