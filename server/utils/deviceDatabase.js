// Real-world device database with actual manufacturers and models
// This would typically be populated from manufacturer catalogs

const deviceDatabase = {
  // Endress+Hauser devices
  endress_hauser: {
    ultrasonic: [
      {
        model: "FMU30",
        type: "ultrasonic_level_sensor",
        range: { min: 0.3, max: 5 }, // meters
        accuracy: "±3mm",
        frequency: 40, // kHz
        beamAngle: 8, // degrees
        deadBand: 0.3,
        outputType: "4-20mA",
        processConnection: "G1½, 1½ NPT",
        applications: ["Water", "Chemicals", "Food"],
      },
      {
        model: "FMU40",
        type: "ultrasonic_level_sensor",
        range: { min: 0.3, max: 8 },
        accuracy: "±2mm",
        frequency: 40,
        beamAngle: 6,
        deadBand: 0.25,
        outputType: "4-20mA",
        processConnection: "G1½, 1½ NPT",
        applications: ["Chemicals", "Water Treatment", "Storage Tanks"],
      },
    ],
    radar: [
      {
        model: "FMR10",
        type: "radar_level_sensor",
        range: { min: 0.1, max: 6 },
        accuracy: "±2mm",
        frequency: 78, // GHz
        beamAngle: 25,
        deadBand: 0.1,
        outputType: "4-20mA",
        processConnection: "G1½, 1½ NPT",
        applications: ["Chemicals", "Hydrocarbons", "Water"],
      },
      {
        model: "FMR20",
        type: "radar_level_sensor",
        range: { min: 0.1, max: 20 },
        accuracy: "±1mm",
        frequency: 78,
        beamAngle: 18,
        deadBand: 0.1,
        outputType: "4-20mA",
        processConnection: "G1½, 1½ NPT, Tri-clamp",
        applications: ["Storage Tanks", "Reactors", "Separators"],
      },
    ],
    pressure: [
      {
        model: "PMC131",
        type: "pressure_transmitter",
        range: { min: 0, max: 10 }, // bar
        accuracy: "±0.075%",
        outputType: "4-20mA",
        processConnection: "G½, ½ NPT",
        diaphragmMaterial: "316L SS",
        applications: ["Level", "Pressure", "Density"],
      },
    ],
  },

  // Siemens devices
  siemens: {
    ultrasonic: [
      {
        model: "SITRANS LU150",
        type: "ultrasonic_level_sensor",
        range: { min: 0.25, max: 6 },
        accuracy: "±0.25%",
        frequency: 40,
        beamAngle: 8,
        deadBand: 0.25,
        outputType: "4-20mA",
        processConnection: "1½ NPT, G1½",
        applications: ["Water", "Wastewater", "Chemicals"],
      },
    ],
    radar: [
      {
        model: "SITRANS LR250",
        type: "radar_level_sensor",
        range: { min: 0.1, max: 20 },
        accuracy: "±2mm",
        frequency: 78,
        beamAngle: 18,
        deadBand: 0.1,
        outputType: "4-20mA",
        processConnection: "G1½, 1½ NPT",
        applications: ["Storage Tanks", "Process Vessels"],
      },
    ],
  },

  // Emerson devices
  emerson: {
    radar: [
      {
        model: "Rosemount 5400",
        type: "radar_level_sensor",
        range: { min: 0.1, max: 40 },
        accuracy: "±1mm",
        frequency: 78,
        beamAngle: 18,
        deadBand: 0.1,
        outputType: "4-20mA",
        processConnection: "Various",
        applications: ["Storage Tanks", "Separators"],
      },
    ],
    pressure: [
      {
        model: "Rosemount 3051L",
        type: "submersible_level_sensor",
        range: { min: 0, max: 200 }, // mH2O
        accuracy: "±0.065%",
        outputType: "4-20mA",
        cableLength: 100, // meters
        applications: ["Wells", "Tanks", "Sumps"],
      },
    ],
  },

  // Vega devices
  vega: {
    radar: [
      {
        model: "VEGAPULS 64",
        type: "radar_level_sensor",
        range: { min: 0.1, max: 75 },
        accuracy: "±1mm",
        frequency: 80,
        beamAngle: 3,
        deadBand: 0.1,
        outputType: "4-20mA",
        processConnection: "Various",
        applications: ["Storage Tanks", "Silos"],
      },
    ],
    ultrasonic: [
      {
        model: "VEGASON 61",
        type: "ultrasonic_level_sensor",
        range: { min: 0.3, max: 5 },
        accuracy: "±1mm",
        frequency: 40,
        beamAngle: 8,
        deadBand: 0.3,
        outputType: "4-20mA",
        processConnection: "G2, 2 NPT",
        applications: ["Water", "Chemicals"],
      },
    ],
  },
}

// Function to get devices by manufacturer and type
const getDevicesByType = (manufacturer, sensorType) => {
  const manufacturerDevices = deviceDatabase[manufacturer.toLowerCase().replace(/[^a-z]/g, "_")]
  if (!manufacturerDevices) return []

  return manufacturerDevices[sensorType] || []
}

// Function to get all manufacturers
const getManufacturers = () => {
  return Object.keys(deviceDatabase).map((key) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  })
}

// Function to get device specifications
const getDeviceSpecs = (manufacturer, model) => {
  const manufacturerKey = manufacturer.toLowerCase().replace(/[^a-z]/g, "_")
  const manufacturerDevices = deviceDatabase[manufacturerKey]

  if (!manufacturerDevices) return null

  for (const sensorType in manufacturerDevices) {
    const device = manufacturerDevices[sensorType].find((d) => d.model === model)
    if (device) return device
  }

  return null
}

module.exports = {
  deviceDatabase,
  getDevicesByType,
  getManufacturers,
  getDeviceSpecs,
}
