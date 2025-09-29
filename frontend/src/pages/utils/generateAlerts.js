export function generateAlerts(sensorData, deviceId = "") {
    const alerts = [];
    // Loop through each parameter in sensorData
    Object.keys(sensorData).forEach(paramName => {
      const series = sensorData[paramName];
      if (!series || !series.length) return;
      const last = series[series.length - 1];
  
      // Example: Generate alerts for high temperature
      if (paramName === "temperature" && last.value > 35) {
        alerts.push({
          id: `temp-high-${deviceId}`,
          title: "High Temperature",
          message: `Temperature is too high (${last.value}°C)`,
          severity: "critical",
          createdAt: last.timestamp
        });
      }
      // Example: Generate alerts for high humidity
      if (paramName === "humidity" && last.value > 80) {
        alerts.push({
          id: `hum-high-${deviceId}`,
          title: "High Humidity",
          message: `Humidity is too high (${last.value}%)`,
          severity: "warning",
          createdAt: last.timestamp
        });
      }
      // Add more rules for other parameters if you want
    });
    return alerts;
  }