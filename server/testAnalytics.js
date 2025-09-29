const externalApiService = require("./services/externalApiService");

async function testAnalytics() {
  try {
    // Step 1: Fetch sensor data to get available deviceTypes
    const sensorDataResponse = await externalApiService.getSensorData({ page: 0, size: 1 });
    const deviceTypes = sensorDataResponse.data?.filterMetadata?.deviceTypes;

    if (!deviceTypes || deviceTypes.length === 0) {
      console.error("❌ No device types found in external API.");
      return;
    }

    // Step 2: Pick the first available deviceType
    const selectedDeviceType = deviceTypes[0];
    console.log(`✅ Using deviceType: ${selectedDeviceType}`);

    // Step 3: Fetch analytics data using this deviceType
   const analyticsResponse = await externalApiService.getAnalyticsData({
  deviceType: selectedDeviceType,
  startDate: "2025-09-01",
  endDate: "2025-09-01",  // ✅ Add this
  period: "DAILY",
});


    console.log("🎯 Analytics data fetched successfully:");
    console.log(JSON.stringify(analyticsResponse.data, null, 2));

  } catch (err) {
    console.error("❌ Failed to fetch analytics data:");
    if (err.data) {
      console.error(JSON.stringify(err.data, null, 2));
    } else {
      console.error(err);
    }
  }
}

testAnalytics();
