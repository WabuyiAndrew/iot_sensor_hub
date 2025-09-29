// This script correctly calls the external API based on the provided documentation.
// It fetches raw sensor data for all devices and then filters it locally.
// To run this file, save it and execute `node debug_external_api.js` in your terminal.
const http = require('http');

(async () => {
  const API_BASE_URL = 'http://188.166.125.28';
  const API_ENDPOINT = '/nkusu-iot/api/nkusu-iot/sensor-data';

  // These are the serial numbers we want to find in the raw data.
  const TARGET_SERIAL_NUMBERS = [
    '16098524D06B', // This device number is from the documentation's example
    '6F8BDB29963C', // Mr Brian Residencee
    '124A7DA90849', // Weather station
    '16098522754E' // AIRQUALITY + NOISE + Ultrasonic depth
  ];

  const fetchRawSensorData = (page = 0, size = 10) => {
    return new Promise((resolve, reject) => {
      const url = `${API_BASE_URL}${API_ENDPOINT}?page=${page}&size=${size}`;
      console.log(`\n--- Fetching raw data from API ---`);
      console.log(`Request URL: ${url}`);

      http.get(url, (res) => {
        let data = '';

        // A chunk of data has been received.
        res.on('data', (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Parse the JSON and resolve.
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            console.log(`✅ Status: ${res.statusCode} - OK`);
            console.log(`--- Received ${parsedData.numberOfElements} of ${parsedData.totalElements} records ---`);
            resolve(parsedData);
          } catch (e) {
            console.error(`❌ Error parsing JSON response: ${e.message}`);
            console.error('The server returned an unexpected response format. It might not be a valid JSON payload.');
            reject(null); // Reject the promise with null
          }
        });
      }).on('error', (err) => {
        console.error('❌ Error fetching data:', err.message);
        reject(null); // Reject the promise with null
      });
    });
  };

  const runDebugScript = async () => {
    let rawData;
    // Use a try...catch block to handle the promise rejection from fetchRawSensorData
    try {
      rawData = await fetchRawSensorData(0, 100);
    } catch (e) {
      console.error("\nExiting script due to a problem fetching data. Check the URL and server status.");
      return;
    }

    if (!rawData || !rawData.content) {
      console.error("Exiting script because the received data is empty or has an invalid structure.");
      return;
    }

    // Now, we'll manually filter the data we received.
    console.log("\n--- Analyzing received data for target serial numbers ---");

    for (const serialNumber of TARGET_SERIAL_NUMBERS) {
      console.log(`\n🔍 Searching for serial number: ${serialNumber}`);
      const foundRecord = rawData.content.find(record => record.deviceNumber === serialNumber);

      if (foundRecord) {
        console.log(`✅ Success: Found a record for device ${serialNumber}.`);
        console.log("--- Record details: ---");
        console.log(JSON.stringify(foundRecord, null, 2));
      } else {
        console.log(`⚠️ Warning: Could not find a record for device ${serialNumber} in this batch.`);
        console.log("You may need to fetch more pages of data from the API to find it.");
      }
    }
    console.log("\n🏁 Debugging script finished.");
  };

  // Start the script
  runDebugScript();
})();
