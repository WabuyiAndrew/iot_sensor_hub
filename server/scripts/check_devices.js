/**
 * Script to count sensor data records by device number.
 *
 * This script connects to the MongoDB database and runs an aggregation
 * query to count the number of sensor data records for each unique
 * device number.
 */
const mongoose = require('mongoose');
require('dotenv').config(); // Ensure your .env file with MONGODB_URI is loaded

// Define the SensorData schema and model
// In a real application, you would import this from your models directory.
const sensorDataSchema = new mongoose.Schema({
    deviceId: String,
    deviceNumber: String,
    // Add other fields as needed
});
const SensorData = mongoose.model('SensorData', sensorDataSchema, 'sensordatas');

// Function to connect to the database and check data
async function checkDeviceData() {
    try {
        // Connect to MongoDB using the correct environment variable name
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔗 Connected to MongoDB successfully.');

        // Aggregate to count records for each device number
        const deviceCounts = await SensorData.aggregate([
            {
                $group: {
                    _id: "$deviceNumber",
                    count: { $sum: 1 }
                }
            }
        ]);

        if (deviceCounts.length > 0) {
            console.log('\n✅ Device records found:');
            deviceCounts.forEach(device => {
                console.log(`- Device ${device._id}: ${device.count} records`);
            });
        } else {
            console.log('\n❌ No sensor data records found.');
        }

    } catch (error) {
        console.error('❌ Error occurred:', error);
    } finally {
        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB.');
    }
}

checkDeviceData();
