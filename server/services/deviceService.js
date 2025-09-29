// server/services/deviceService.js
const devices = [
  { id: "6848b5f0baea88b01a894956", deviceNumber: "124A7DA90849", type: "WeatherS" },
  { id: "abcd1234", deviceNumber: "5678XYZ", type: "Level1" },
  // Add all your devices here or fetch from DB
];

class DeviceService {
  async getDeviceById(deviceId) {
    return devices.find((d) => d.id === deviceId) || null;
  }
}

module.exports = new DeviceService();
