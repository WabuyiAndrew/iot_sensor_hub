"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useWebSocket } from "../contexts/WebSocketContext"

export const useRealTimeAlerts = () => {
  const { axiosInstance } = useAuth()
  const { subscribe, subscribeToDevice, getDeviceSensorData, isConnected, sendMessage } = useWebSocket()

  const [devices, setDevices] = useState([])
  const [thresholds, setThresholds] = useState([])
  const [activeAlerts, setActiveAlerts] = useState(new Map())
  const [alertHistory, setAlertHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const deviceSubscriptions = useRef(new Map())
  const alertCheckInterval = useRef(null)
  const lastAlertCheck = useRef(new Map())

  // Fetch all devices from the database
  const fetchDevices = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/sensor/sensor-data", {
        params: { page: 0, size: 1000 }, // Get all devices
      })

      if (response.data.success) {
        // Extract unique devices from sensor data
        const deviceMap = new Map()
        response.data.data.forEach((reading) => {
          if (reading.device && reading.device._id) {
            deviceMap.set(reading.device._id, {
              _id: reading.device._id,
              serialNumber: reading.device.serialNumber,
              deviceName: reading.device.deviceName,
              location: reading.device.location,
              lastReading: reading,
              isOnline: true, // We'll update this based on WebSocket data
            })
          }
        })

        const deviceList = Array.from(deviceMap.values())
        setDevices(deviceList)
        console.log("Fetched devices:", deviceList.length)
        return deviceList
      }
    } catch (err) {
      console.error("Error fetching devices:", err)
      setError("Failed to fetch devices")
      return []
    }
  }, [axiosInstance])

  // Fetch alert thresholds
  const fetchThresholds = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/thresholds")
      if (response.data.success) {
        const activeThresholds = response.data.data.filter((t) => t.isActive)
        setThresholds(activeThresholds)
        console.log("Fetched active thresholds:", activeThresholds.length)
        return activeThresholds
      }
    } catch (err) {
      console.error("Error fetching thresholds:", err)
      setError("Failed to fetch thresholds")
      return []
    }
  }, [axiosInstance])

  // Get latest reading for a specific device
  const getLatestReading = useCallback(
    async (serialNumber) => {
      try {
        const response = await axiosInstance.get(`/api/sensor/latest-analytics/${serialNumber}`)
        if (response.data.success) {
          return response.data.data
        }
      } catch (err) {
        console.error(`Error fetching latest reading for ${serialNumber}:`, err)
      }
      return null
    },
    [axiosInstance],
  )

  // Check if a reading violates any thresholds
  const checkThresholds = useCallback((reading, deviceInfo, thresholdList) => {
    const violations = []

    thresholdList.forEach((threshold) => {
      const parameterValue = reading[threshold.parameter]

      if (parameterValue !== undefined && parameterValue !== null) {
        let alertLevel = null
        let thresholdValue = null

        // Check critical threshold first
        if (threshold.criticalThreshold !== null && parameterValue >= threshold.criticalThreshold) {
          alertLevel = "critical"
          thresholdValue = threshold.criticalThreshold
        }
        // Then check warning threshold
        else if (threshold.warningThreshold !== null && parameterValue >= threshold.warningThreshold) {
          alertLevel = "warning"
          thresholdValue = threshold.warningThreshold
        }

        if (alertLevel) {
          violations.push({
            deviceId: deviceInfo._id,
            deviceName: deviceInfo.deviceName,
            serialNumber: deviceInfo.serialNumber,
            location: deviceInfo.location,
            parameter: threshold.parameter,
            currentValue: parameterValue,
            thresholdValue,
            alertLevel,
            threshold: threshold,
            timestamp: reading.timestamp || new Date().toISOString(),
          })
        }
      }
    })

    return violations
  }, [])

  // Generate alert ID
  const generateAlertId = (deviceId, parameter) => {
    return `${deviceId}_${parameter}`
  }

  // Create or update alert
  const handleAlert = useCallback((violation) => {
    const alertId = generateAlertId(violation.deviceId, violation.parameter)
    const now = new Date().toISOString()

    setActiveAlerts((prev) => {
      const newAlerts = new Map(prev)
      const existingAlert = newAlerts.get(alertId)

      if (existingAlert) {
        // Update existing alert
        newAlerts.set(alertId, {
          ...existingAlert,
          currentValue: violation.currentValue,
          lastUpdated: now,
          occurrenceCount: (existingAlert.occurrenceCount || 1) + 1,
        })
      } else {
        // Create new alert
        const newAlert = {
          id: alertId,
          deviceId: violation.deviceId,
          deviceName: violation.deviceName,
          serialNumber: violation.serialNumber,
          location: violation.location,
          parameter: violation.parameter,
          parameterDisplayName: getParameterDisplayName(violation.parameter),
          currentValue: violation.currentValue,
          thresholdValue: violation.thresholdValue,
          alertLevel: violation.alertLevel,
          status: "active",
          createdAt: now,
          lastUpdated: now,
          occurrenceCount: 1,
          threshold: violation.threshold,
        }

        newAlerts.set(alertId, newAlert)

        // Add to history
        setAlertHistory((prev) => [newAlert, ...prev.slice(0, 99)]) // Keep last 100 alerts

        console.log(
          `🚨 New alert created: ${violation.deviceName} - ${violation.parameter} = ${violation.currentValue} (threshold: ${violation.thresholdValue})`,
        )
      }

      return newAlerts
    })
  }, [])

  // Clear resolved alerts
  const clearResolvedAlerts = useCallback((deviceId, currentReading, thresholdList) => {
    setActiveAlerts((prev) => {
      const newAlerts = new Map(prev)
      let hasChanges = false

      // Check each active alert for this device
      prev.forEach((alert, alertId) => {
        if (alert.deviceId === deviceId) {
          const threshold = thresholdList.find((t) => t.parameter === alert.parameter)
          const currentValue = currentReading[alert.parameter]

          if (threshold && currentValue !== undefined && currentValue !== null) {
            // Check if the value is now within acceptable range
            const isStillViolating =
              (threshold.criticalThreshold !== null && currentValue >= threshold.criticalThreshold) ||
              (threshold.warningThreshold !== null && currentValue >= threshold.warningThreshold)

            if (!isStillViolating) {
              // Mark alert as resolved
              newAlerts.set(alertId, {
                ...alert,
                status: "resolved",
                resolvedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
              })
              hasChanges = true
              console.log(`✅ Alert resolved: ${alert.deviceName} - ${alert.parameter}`)
            }
          }
        }
      })

      return hasChanges ? newAlerts : prev
    })
  }, [])

  // Process device reading
  const processDeviceReading = useCallback(
    (deviceInfo, reading) => {
      if (!reading || !thresholds.length) return

      // Check for threshold violations
      const violations = checkThresholds(reading, deviceInfo, thresholds)

      // Handle new alerts
      violations.forEach((violation) => {
        handleAlert(violation)
      })

      // Clear resolved alerts
      clearResolvedAlerts(deviceInfo._id, reading, thresholds)

      // Update last check time
      lastAlertCheck.current.set(deviceInfo._id, Date.now())
    },
    [thresholds, checkThresholds, handleAlert, clearResolvedAlerts],
  )

  // Subscribe to device updates via WebSocket
  const subscribeToDeviceUpdates = useCallback(
    (device) => {
      if (deviceSubscriptions.current.has(device._id)) {
        return // Already subscribed
      }

      const unsubscribe = subscribeToDevice(device._id, (sensorData) => {
        console.log(`📊 Real-time data for ${device.deviceName}:`, sensorData)
        processDeviceReading(device, sensorData)
      })

      deviceSubscriptions.current.set(device._id, unsubscribe)
      console.log(`📡 Subscribed to device: ${device.deviceName}`)
    },
    [subscribeToDevice, processDeviceReading],
  )

  // Periodic check for devices without recent WebSocket updates
  const performPeriodicCheck = useCallback(async () => {
    if (!devices.length || !thresholds.length) return

    const now = Date.now()
    const staleThreshold = 5 * 60 * 1000 // 5 minutes

    for (const device of devices) {
      const lastCheck = lastAlertCheck.current.get(device._id) || 0

      if (now - lastCheck > staleThreshold) {
        try {
          // Get latest reading from API
          const latestReading = await getLatestReading(device.serialNumber)
          if (latestReading) {
            processDeviceReading(device, latestReading)
          }
        } catch (err) {
          console.error(`Error checking device ${device.deviceName}:`, err)
        }
      }
    }
  }, [devices, thresholds, getLatestReading, processDeviceReading])

  // Initialize the alert system
  const initialize = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch devices and thresholds
      const [deviceList, thresholdList] = await Promise.all([fetchDevices(), fetchThresholds()])

      if (deviceList.length && thresholdList.length) {
        // Subscribe to all devices
        deviceList.forEach((device) => {
          subscribeToDeviceUpdates(device)
        })

        // Perform initial check
        for (const device of deviceList) {
          try {
            const latestReading = await getLatestReading(device.serialNumber)
            if (latestReading) {
              processDeviceReading(device, latestReading)
            }
          } catch (err) {
            console.error(`Error getting initial reading for ${device.deviceName}:`, err)
          }
        }
      }
    } catch (err) {
      console.error("Error initializing alert system:", err)
      setError("Failed to initialize alert system")
    } finally {
      setLoading(false)
    }
  }, [fetchDevices, fetchThresholds, subscribeToDeviceUpdates, getLatestReading, processDeviceReading])

  // WebSocket message handler
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "sensor-data" && message.data) {
        const deviceId = message.data.deviceId || message.data.device?._id
        const device = devices.find((d) => d._id === deviceId)

        if (device) {
          processDeviceReading(device, message.data)
        }
      }
    })

    return unsubscribe
  }, [subscribe, devices, processDeviceReading])

  // Set up periodic checking
  useEffect(() => {
    if (devices.length && thresholds.length) {
      alertCheckInterval.current = setInterval(performPeriodicCheck, 2 * 60 * 1000) // Every 2 minutes

      return () => {
        if (alertCheckInterval.current) {
          clearInterval(alertCheckInterval.current)
        }
      }
    }
  }, [devices.length, thresholds.length, performPeriodicCheck])

  // Initialize when WebSocket is connected
  useEffect(() => {
    if (isConnected) {
      initialize()
    }
  }, [isConnected, initialize])

  // Cleanup subscriptions
  useEffect(() => {
    return () => {
      deviceSubscriptions.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe()
        }
      })
      deviceSubscriptions.current.clear()

      if (alertCheckInterval.current) {
        clearInterval(alertCheckInterval.current)
      }
    }
  }, [])

  // Helper function for parameter display names
  const getParameterDisplayName = (parameter) => {
    const displayNames = {
      temperature: "Temperature",
      humidity: "Humidity",
      pm25: "PM2.5",
      pm10: "PM10",
      co2: "CO2",
      atmosphericPressure: "Atmospheric Pressure",
      windSpeed: "Wind Speed",
      windDir: "Wind Direction",
      rainfall: "Rainfall",
      totalSolarRadiation: "Solar Radiation",
      noise: "Noise Level",
      ultrasonic_liquid_level: "Liquid Level (Ultrasonic)",
      pressure_level: "Pressure Level",
      liquid_level_raw: "Liquid Level (Raw)",
      signalStrength: "Signal Strength",
    }
    return displayNames[parameter] || parameter
  }

  // Manual alert actions
  const acknowledgeAlert = useCallback((alertId) => {
    setActiveAlerts((prev) => {
      const newAlerts = new Map(prev)
      const alert = newAlerts.get(alertId)
      if (alert && alert.status === "active") {
        newAlerts.set(alertId, {
          ...alert,
          status: "acknowledged",
          acknowledgedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        })
      }
      return newAlerts
    })
  }, [])

  const resolveAlert = useCallback((alertId) => {
    setActiveAlerts((prev) => {
      const newAlerts = new Map(prev)
      const alert = newAlerts.get(alertId)
      if (alert && (alert.status === "active" || alert.status === "acknowledged")) {
        newAlerts.set(alertId, {
          ...alert,
          status: "resolved",
          resolvedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        })
      }
      return newAlerts
    })
  }, [])

  const dismissAlert = useCallback((alertId) => {
    setActiveAlerts((prev) => {
      const newAlerts = new Map(prev)
      newAlerts.delete(alertId)
      return newAlerts
    })
  }, [])

  // Get alert statistics
  const getAlertStats = useCallback(() => {
    const alerts = Array.from(activeAlerts.values())
    return {
      total: alerts.length,
      active: alerts.filter((a) => a.status === "active").length,
      acknowledged: alerts.filter((a) => a.status === "acknowledged").length,
      resolved: alerts.filter((a) => a.status === "resolved").length,
      critical: alerts.filter((a) => a.alertLevel === "critical").length,
      warning: alerts.filter((a) => a.alertLevel === "warning").length,
    }
  }, [activeAlerts])

  return {
    // Data
    devices,
    thresholds,
    activeAlerts: Array.from(activeAlerts.values()),
    alertHistory,

    // State
    loading,
    error,
    isConnected,

    // Actions
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    initialize,

    // Utilities
    getAlertStats,
    getParameterDisplayName,
  }
}
