export const EXTERNAL_API_PARAMETER_MAPPING = {
  // Weather Station parameters
  temperature: "temperatures",
  humidity: "humidities",
  atmospheric_pressure: "atmPressures",
  atmosphericPressure: "atmPressures", // Add this mapping
  wind_speed: "windSpeeds",
  windSpeed: "windSpeeds", // Add this mapping
  wind_direction: "windDirs",
  windDir: "windDirs", // Add this mapping
  rainfall: "rainfalls",
  total_solar_radiation: "radiations",
  totalSolarRadiation: "radiations", // Add this mapping
  pm2_5: "pm25s",
  pm25: "pm25s", // Add this mapping
  pm10: "pm10s",
  signal_rssi_dbm: "signalStrengths",
  signalStrength: "signalStrengths", // Add this mapping

  // Air Quality parameters
  co2: "co2s",
  noise: "noises",

  // Generic parameters
  battery_level: "batteryLevels",
  batteryLevel: "batteryLevels", // Add this mapping
  error_code: "errorCodes",
  errorCode: "errorCodes", // Add this mapping
  version: "versions",
}

export const DEVICE_TYPE_PARAMETERS = {
  WeatherS: [
    "temperature",
    "humidity",
    "atmosphericPressure",
    "windSpeed",
    "windDir",
    "rainfall",
    "totalSolarRadiation",
    "pm25",
    "pm10",
    "signalStrength",
  ],
  air_quality: ["temperature", "humidity", "pm25", "pm10", "co2", "noise", "signalStrength", "batteryLevel"],
  multi_sensor: ["temperature", "humidity", "atmosphericPressure", "signalStrength", "batteryLevel"],
  temperature_humidity_sensor: ["temperature", "humidity", "signalStrength", "batteryLevel"],
}

export const getExternalApiParameterName = (localParamName) => {
  return EXTERNAL_API_PARAMETER_MAPPING[localParamName] || localParamName
}

export const getParametersForDeviceType = (deviceType) => {
  return DEVICE_TYPE_PARAMETERS[deviceType] || ["temperature", "humidity", "signalStrength", "batteryLevel"]
}