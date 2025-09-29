"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./AuthContext"
import { useWebSocket } from "./WebSocketContext"

const GlobalAlertsContext = createContext(null)

export const useGlobalAlerts = () => {
  const context = useContext(GlobalAlertsContext)
  if (!context) {
    throw new Error("useGlobalAlerts must be used within a GlobalAlertsProvider")
  }
  return context
}

export const GlobalAlertsProvider = ({ children }) => {
  const { axiosInstance, user } = useAuth()
  const { isConnected, subscribe, sendMessage } = useWebSocket()

  // Alert state
  const [alerts, setAlerts] = useState([])
  const [devices, setDevices] = useState([])
  const [thresholds, setThresholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const [deviceStats, setDeviceStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    offlineDevices: 0,
    devicesMonitored: 0,
  })

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastProcessed, setLastProcessed] = useState(null)

  // Refs for managing intervals and preventing memory leaks
  const deviceFetchInterval = useRef(null)
  const alertProcessingInterval = useRef(null)
  const thresholdCacheRef = useRef(new Map())
  const deviceAnalyticsCache = useRef(new Map())

  // Configuration
  const DEVICE_FETCH_INTERVAL = 10000 //1 and half minutes - fetch device list
  const ALERT_PROCESSING_INTERVAL = 60000 // 60 seconds - process alerts
  const ANALYTICS_CACHE_TTL = 75000 // 75 seconds - cache TTL for analytics

  // Parameter display names
  const parameterDisplayNames = {
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
    ultrasonic_liquid_level: "Ultrasonic Level",
    pressure_level: "Pressure Level",
    liquid_level_raw: "Raw Liquid Level",
    signalStrength: "Signal Strength",
  }

  const getParameterDisplayName = useCallback((parameter) => {
    return parameterDisplayNames[parameter] || parameter.replace(/([A-Z])/g, " $1").trim()
  }, [])

  // Fetch devices list
  const fetchDevices = useCallback(async () => {
    try {
      console.log("🔄 [GlobalAlerts] Fetching devices list...")
      const response = await axiosInstance.get("/api/devices")
      const devicesList = response.data.data || response.data || []

      console.log(`📋 [GlobalAlerts] Loaded ${devicesList.length} devices`)
      setDevices(devicesList)
      return devicesList
    } catch (err) {
      console.error("❌ [GlobalAlerts] Failed to fetch devices:", err)
      setError("Failed to fetch devices list")
      return []
    }
  }, [axiosInstance])

  // Fetch thresholds configuration
  const fetchThresholds = useCallback(async () => {
    try {
      console.log("🔄 [GlobalAlerts] Fetching thresholds...")
      const response = await axiosInstance.get("/api/thresholds")
      const thresholdsList = response.data.data || response.data || []

      // Create threshold map for faster lookups
      const thresholdMap = new Map()
      thresholdsList.forEach((threshold) => {
        if (threshold.isActive) {
          thresholdMap.set(threshold.parameter, threshold)
        }
      })

      thresholdCacheRef.current = thresholdMap
      setThresholds(thresholdsList)
      console.log(`📊 [GlobalAlerts] Loaded ${thresholdsList.length} thresholds (${thresholdMap.size} active)`)

      return thresholdMap
    } catch (err) {
      console.error("❌ [GlobalAlerts] Failed to fetch thresholds:", err)
      setError("Failed to fetch thresholds")
      return new Map()
    }
  }, [axiosInstance])

  // Fetch latest analytics for a specific device
  const fetchDeviceAnalytics = useCallback(
    async (device) => {
      try {
        const serialNumber = device.serialNumber || device.deviceId
        if (!serialNumber) {
          console.warn(`⚠️ [GlobalAlerts] Device missing serial number:`, device)
          return null
        }

        // Check cache first
        const cacheKey = `analytics_${serialNumber}`
        const cached = deviceAnalyticsCache.current.get(cacheKey)
        const now = Date.now()

        if (cached && now - cached.timestamp < ANALYTICS_CACHE_TTL) {
          console.log(`📦 [GlobalAlerts] Using cached analytics for ${serialNumber}`)
          return cached.data
        }

        console.log(`🔄 [GlobalAlerts] Fetching latest analytics for device: ${serialNumber}`)
        const response = await axiosInstance.get(
          `/api/sensor/latest-analytics/${serialNumber}`,
          { timeout: 60000 }, // Increase timeout to 60 seconds
        )
        const analyticsData = response.data.data || response.data

        // Cache the result
        deviceAnalyticsCache.current.set(cacheKey, {
          data: analyticsData,
          timestamp: now,
        })

        console.log(`✅ [GlobalAlerts] Received analytics for ${serialNumber}:`, analyticsData)
        return analyticsData
      } catch (err) {
        console.error(`❌ [GlobalAlerts] Failed to fetch analytics for ${device.serialNumber}:`, err)
        return null
      }
    },
    [axiosInstance],
  )

  // Process alerts for a device's analytics data
  const processDeviceAlerts = useCallback(
    (device, analyticsData, thresholdMap) => {
      if (!analyticsData || !device) return []

      const deviceAlerts = []
      const deviceId = device._id || device.id
      const deviceName = device.deviceName || device.name || `Device ${device.serialNumber}`
      const location = device.location || "Unknown Location"

      // Process each parameter in the analytics data
      Object.entries(analyticsData).forEach(([parameter, value]) => {
        // Skip non-numeric values and metadata
        if (typeof value !== "number" || parameter === "timestamp" || parameter === "_id") {
          return
        }

        const threshold = thresholdMap.get(parameter)
        if (!threshold) return

        const { warningThreshold, criticalThreshold } = threshold
        let alertLevel = null
        let thresholdValue = null

        // Determine alert level
        if (
          criticalThreshold !== null &&
          ((criticalThreshold > warningThreshold && value >= criticalThreshold) ||
            (criticalThreshold < warningThreshold && value <= criticalThreshold))
        ) {
          alertLevel = "critical"
          thresholdValue = criticalThreshold
        } else if (
          warningThreshold !== null &&
          ((warningThreshold > criticalThreshold && value >= warningThreshold) ||
            (warningThreshold < criticalThreshold && value <= warningThreshold) ||
            (criticalThreshold === null && value >= warningThreshold))
        ) {
          alertLevel = "warning"
          thresholdValue = warningThreshold
        }

        if (alertLevel) {
          const alertId = `${deviceId}_${parameter}_${alertLevel}`

          deviceAlerts.push({
            id: alertId,
            deviceId: deviceId,
            deviceName: deviceName,
            serialNumber: device.serialNumber,
            location: location,
            parameter: parameter,
            parameterDisplayName: getParameterDisplayName(parameter),
            currentValue: value,
            thresholdValue: thresholdValue,
            alertLevel: alertLevel,
            status: "active",
            firstDetected: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            occurrenceCount: 1,
            description: threshold.description || `${parameter} ${alertLevel} threshold exceeded`,
          })
        }
      })

      return deviceAlerts
    },
    [getParameterDisplayName],
  )

  // Main alert processing function
  const processAlerts = useCallback(async () => {
    if (isProcessing || !isInitialized) return

    setIsProcessing(true)
    console.log("🚨 [GlobalAlerts] Starting alert processing cycle...")

    try {
      const currentDevices = devices
      const thresholdMap = thresholdCacheRef.current

      if (currentDevices.length === 0 || thresholdMap.size === 0) {
        console.log("⏭️ [GlobalAlerts] Skipping alert processing - no devices or thresholds")
        setIsProcessing(false)
        return
      }

      console.log(
        `🔍 [GlobalAlerts] Processing alerts for ${currentDevices.length} devices with ${thresholdMap.size} active thresholds`,
      )

      const newAlerts = []
      const processingPromises = []

      // Process devices in batches to avoid overwhelming the API
      const BATCH_SIZE = 4
      for (let i = 0; i < currentDevices.length; i += BATCH_SIZE) {
        const batch = currentDevices.slice(i, i + BATCH_SIZE)

        const batchPromises = batch.map(async (device) => {
          try {
            const analyticsData = await fetchDeviceAnalytics(device)
            if (analyticsData) {
              const deviceAlerts = processDeviceAlerts(device, analyticsData, thresholdMap)
              return deviceAlerts
            }
            return []
          } catch (err) {
            console.error(`❌ [GlobalAlerts] Error processing device ${device.serialNumber}:`, err)
            return []
          }
        })

        processingPromises.push(...batchPromises)

        // Add delay between batches to prevent API overload
        if (i + BATCH_SIZE < currentDevices.length) {
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      }

      const batchResults = await Promise.allSettled(processingPromises)

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          newAlerts.push(...result.value)
        } else {
          console.error(`❌ [GlobalAlerts] Failed to process device batch ${index}:`, result.reason)
        }
      })

      // Update alerts state, merging with existing alerts to maintain acknowledgment status
      setAlerts((prevAlerts) => {
        const alertMap = new Map()

        // Keep existing alerts with their status
        prevAlerts.forEach((alert) => {
          alertMap.set(alert.id, alert)
        })

        // Add or update with new alerts
        newAlerts.forEach((newAlert) => {
          const existingAlert = alertMap.get(newAlert.id)
          if (existingAlert) {
            // Update existing alert but preserve status and count
            alertMap.set(newAlert.id, {
              ...newAlert,
              status: existingAlert.status,
              firstDetected: existingAlert.firstDetected,
              occurrenceCount: existingAlert.occurrenceCount + 1,
              acknowledgedBy: existingAlert.acknowledgedBy,
              acknowledgedAt: existingAlert.acknowledgedAt,
              resolvedBy: existingAlert.resolvedBy,
              resolvedAt: existingAlert.resolvedAt,
            })
          } else {
            // New alert
            alertMap.set(newAlert.id, newAlert)
          }
        })

        return Array.from(alertMap.values())
      })

      console.log(`✅ [GlobalAlerts] Alert processing complete. Found ${newAlerts.length} active alerts`)
      setLastProcessed(new Date())
      setError(null)
    } catch (err) {
      console.error("❌ [GlobalAlerts] Alert processing failed:", err)
      setError("Alert processing failed")
    } finally {
      setIsProcessing(false)
    }
  }, [devices, fetchDeviceAnalytics, processDeviceAlerts, isProcessing, isInitialized])

  const fetchDeviceStats = useCallback(async () => {
    try {
      console.log("🔄 [GlobalAlerts] Fetching device statistics...")
      const response = await axiosInstance.get("/api/alerts/device-stats")
      const stats = response.data.data || response.data || {}

      setDeviceStats(stats)
      console.log("📊 [GlobalAlerts] Device statistics updated:", stats)
      return stats
    } catch (err) {
      console.error("❌ [GlobalAlerts] Failed to fetch device statistics:", err)
      // Fallback to calculating from devices list
      const fallbackStats = {
        totalDevices: devices.length,
        activeDevices: devices.filter((d) => d.status === "active").length,
        offlineDevices: devices.filter((d) => d.status !== "active").length,
        devicesMonitored: devices.length,
      }
      setDeviceStats(fallbackStats)
      return fallbackStats
    }
  }, [axiosInstance, devices])

  // Initialize the global alerts system
  const initialize = useCallback(async () => {
    console.log("🚀 [GlobalAlerts] Initializing global alerts system...")
    setLoading(true)
    setError(null)

    try {
      // Fetch initial data
      const [devicesList, thresholdMap, deviceStatsData] = await Promise.all([
        fetchDevices(),
        fetchThresholds(),
        fetchDeviceStats(), // Added device stats fetching
      ])

      if (devicesList.length > 0 && thresholdMap.size > 0) {
        setIsInitialized(true)
        console.log("✅ [GlobalAlerts] Initialization complete")

        // Start initial alert processing
        setTimeout(() => {
          processAlerts()
        }, 2000)
      } else {
        console.warn("⚠️ [GlobalAlerts] No devices or thresholds found")
      }
    } catch (err) {
      console.error("❌ [GlobalAlerts] Initialization failed:", err)
      setError("Failed to initialize alerts system")
    } finally {
      setLoading(false)
    }
  }, [fetchDevices, fetchThresholds, fetchDeviceStats, processAlerts])

  // Alert management functions
  const acknowledgeAlert = useCallback(
    (alertId) => {
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: "acknowledged",
                acknowledgedBy: user?.emailid || user?.username,
                acknowledgedAt: new Date().toISOString(),
              }
            : alert,
        ),
      )
      console.log(`✅ [GlobalAlerts] Alert acknowledged: ${alertId}`)
    },
    [user],
  )

  const resolveAlert = useCallback(
    (alertId) => {
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: "resolved",
                resolvedBy: user?.emailid || user?.username,
                resolvedAt: new Date().toISOString(),
              }
            : alert,
        ),
      )
      console.log(`✅ [GlobalAlerts] Alert resolved: ${alertId}`)
    },
    [user],
  )

  const dismissAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
    console.log(`🗑️ [GlobalAlerts] Alert dismissed: ${alertId}`)
  }, [])

  // Get alert statistics
  const getAlertStats = useCallback(() => {
    const stats = {
      total: alerts.length,
      active: alerts.filter((a) => a.status === "active").length,
      acknowledged: alerts.filter((a) => a.status === "acknowledged").length,
      resolved: alerts.filter((a) => a.status === "resolved").length,
      critical: alerts.filter((a) => a.alertLevel === "critical").length,
      warning: alerts.filter((a) => a.alertLevel === "warning").length,
    }
    return stats
  }, [alerts])

  const filterAlertsForUser = useCallback((alerts, currentUser) => {
    if (!currentUser) return []

    // Admin sees all alerts
    if (currentUser.role === "admin") {
      return alerts
    }

    // Regular users only see alerts from their assigned devices
    const userDeviceIds = currentUser.devices?.map((d) => d._id || d.id || d) || []
    return alerts.filter((alert) => userDeviceIds.includes(alert.deviceId))
  }, [])

  // Setup intervals and WebSocket subscriptions
  useEffect(() => {
    if (!user || !isConnected) return

    console.log("🔧 [GlobalAlerts] Setting up intervals and subscriptions")

    // Initialize the system
    initialize()

    // Setup device fetching interval
    deviceFetchInterval.current = setInterval(() => {
      console.log("🔄 [GlobalAlerts] Periodic device list refresh")
      fetchDevices()
      fetchDeviceStats() // Also refresh device stats periodically
    }, DEVICE_FETCH_INTERVAL)

    // Setup alert processing interval
    alertProcessingInterval.current = setInterval(() => {
      if (isInitialized) {
        console.log("🔄 [GlobalAlerts] Periodic alert processing")
        processAlerts()
      }
    }, ALERT_PROCESSING_INTERVAL)

    // WebSocket subscription for real-time updates
    const unsubscribe = subscribe((message) => {
      if (message.type === "sensor-data" || message.type === "device-status") {
        // Clear analytics cache for updated device
        const deviceId = message.data?.deviceId
        if (deviceId) {
          const device = devices.find((d) => d._id === deviceId || d.id === deviceId)
          if (device) {
            const cacheKey = `analytics_${device.serialNumber}`
            deviceAnalyticsCache.current.delete(cacheKey)
            console.log(`🧹 [GlobalAlerts] Cleared analytics cache for ${device.serialNumber}`)
          }
        }
      }

      if (message.type === "system-alert" && message.payload) {
        console.log("🚨 [GlobalAlerts] Received real-time alert:", message.payload)

        // Apply user-based filtering
        const shouldShowAlert =
          user?.role === "admin" || user?.devices?.some((d) => (d._id || d.id || d) === message.payload.deviceId)

        if (!shouldShowAlert) {
          console.log(
            `[GlobalAlerts] Filtering out real-time alert for device ${message.payload.deviceId} - not assigned to user`,
          )
          return
        }

        setAlerts((prevAlerts) => {
          // Check if alert already exists
          const existingIndex = prevAlerts.findIndex((alert) => alert.id === message.payload.id)
          if (existingIndex !== -1) {
            // Update existing alert
            const updatedAlerts = [...prevAlerts]
            updatedAlerts[existingIndex] = { ...updatedAlerts[existingIndex], ...message.payload }
            return updatedAlerts
          } else {
            // Add new alert
            return [message.payload, ...prevAlerts]
          }
        })
      }
    })

    return () => {
      console.log("🧹 [GlobalAlerts] Cleaning up intervals and subscriptions")
      if (deviceFetchInterval.current) {
        clearInterval(deviceFetchInterval.current)
      }
      if (alertProcessingInterval.current) {
        clearInterval(alertProcessingInterval.current)
      }
      unsubscribe()
    }
  }, [
    user,
    isConnected,
    initialize,
    fetchDevices,
    fetchDeviceStats, // Added fetchDeviceStats dependency
    processAlerts,
    subscribe,
    devices,
    isInitialized,
    filterAlertsForUser,
  ])

  const refreshAlerts = useCallback(async () => {
    console.log("🔄 [GlobalAlerts] Manual refresh requested")

    // Clear caches
    deviceAnalyticsCache.current.clear()
    thresholdCacheRef.current.clear()

    // Re-initialize
    await initialize()
  }, [initialize])

  const contextValue = {
    // Alert data - apply user filtering
    alerts: filterAlertsForUser(alerts, user),
    devices,
    thresholds,
    deviceStats, // Added device statistics to context

    // State
    loading,
    error,
    isInitialized,
    isProcessing,
    lastProcessed,

    // Connection status
    isConnected,

    // Alert management functions
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,

    // Utility functions
    getAlertStats,
    getParameterDisplayName,
    refreshAlerts,

    // Manual control
    processAlerts,
    fetchDevices,
    fetchThresholds,
    fetchDeviceStats, // Added fetchDeviceStats to context
  }

  return <GlobalAlertsContext.Provider value={contextValue}>{children}</GlobalAlertsContext.Provider>
}
