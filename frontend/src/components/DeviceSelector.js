"use client"

import { useState, useEffect } from "react"
import { Zap, Info, CheckCircle } from "lucide-react"
import { baseurl } from "../App"

const DeviceSelector = ({ selectedDevices = [], onDeviceSelect, onDeviceDeselect }) => {
  const [availableDevices, setAvailableDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAvailableDevices()
  }, [])

  const fetchAvailableDevices = async () => {
    try {
      const response = await fetch(`${baseurl}/api/tank-types/devices/available`, {
        credentials: "include",
      })
      const result = await response.json()
      if (result.success) {
        setAvailableDevices(result.data)
      }
    } catch (error) {
      console.error("Error fetching available devices:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSensorTypeFromDevice = (device) => {
    const typeMap = {
      ultrasonic_level_sensor: "Ultrasonic",
      radar_level_sensor: "Radar",
      pressure_transmitter: "Pressure",
      submersible_level_sensor: "Submersible",
      float_switch: "Float",
      capacitive_level_sensor: "Capacitive",
      guided_wave_radar: "Guided Wave Radar",
      laser_level_sensor: "Laser",
      vibrating_fork: "Vibrating Fork",
      load_cell: "Load Cell",
    }
    return typeMap[device.type] || device.type
  }

  const getDeviceStatusColor = (status) => {
    switch (status) {
      case "online":
        return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400"
      case "offline":
        return "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
      case "maintenance":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400"
      case "error":
        return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
    }
  }

  const handleDeviceToggle = (device) => {
    if (selectedDevices.includes(device._id)) {
      onDeviceDeselect(device._id)
    } else {
      onDeviceSelect(device._id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Zap className="w-5 h-5 text-blue-500" />
        <h4 className="font-medium text-gray-900 dark:text-white">Available Level Sensors</h4>
        <span className="text-sm text-gray-500 dark:text-gray-400">({availableDevices.length} available)</span>
      </div>

      {availableDevices.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">No available level sensors found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            All level sensors are already assigned to tanks
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
          {availableDevices.map((device) => {
            const isSelected = selectedDevices.includes(device._id)
            return (
              <div
                key={device._id}
                onClick={() => handleDeviceToggle(device)}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {isSelected ? (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Zap className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{device.name}</h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getDeviceStatusColor(
                            device.status,
                          )}`}
                        >
                          {device.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Serial: {device.serialNumber}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Type: {getSensorTypeFromDevice(device)}</span>
                        {device.lastSeen && <span>Last seen: {new Date(device.lastSeen).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Device specifications if available */}
                {device.specifications && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {device.specifications.maxRange && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Range:</span>
                          <span className="ml-1 text-gray-700 dark:text-gray-300">
                            0-{device.specifications.maxRange}m
                          </span>
                        </div>
                      )}
                      {device.specifications.accuracy && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Accuracy:</span>
                          <span className="ml-1 text-gray-700 dark:text-gray-300">
                            {device.specifications.accuracy}
                          </span>
                        </div>
                      )}
                      {device.specifications.outputType && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Output:</span>
                          <span className="ml-1 text-gray-700 dark:text-gray-300">
                            {device.specifications.outputType}
                          </span>
                        </div>
                      )}
                      {device.manufacturer && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Make:</span>
                          <span className="ml-1 text-gray-700 dark:text-gray-300">{device.manufacturer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedDevices.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedDevices.length} device{selectedDevices.length > 1 ? "s" : ""} selected for this tank
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeviceSelector
