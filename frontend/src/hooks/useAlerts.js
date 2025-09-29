"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"

const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

// Parameter descriptions for user comprehension
const PARAM_LABELS = {
  temperature: { label: "Temperature", unit: "°C", action: "Check cooling/ventilation" },
  humidity: { label: "Humidity", unit: "%RH", action: "Monitor for condensation" },
  pm2_5: { label: "PM2.5", unit: "μg/m³", action: "Improve air filtration" },
  pm10: { label: "PM10", unit: "μg/m³", action: "Improve air filtration" },
  noise: { label: "Noise Level", unit: "dB", action: "Investigate noise sources" },
  liquid_level: { label: "Liquid Level", unit: "units", action: "Refill tank" },
  ultrasonic_liquid_level: { label: "Ultrasonic Level", unit: "m", action: "Refill tank" },
}

// Severity mapping
const SEVERITY = {
  critical: {
    icon: "AlertCircle",
    border: "border-l-4 border-red-500",
    bg: "bg-red-50/80 dark:bg-red-900/10",
    text: "text-red-800 dark:text-red-200",
    label: "Critical",
  },
  warning: {
    icon: "AlertTriangle",
    border: "border-l-4 border-yellow-400",
    bg: "bg-yellow-50/80 dark:bg-yellow-900/10",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "Warning",
  },
  info: {
    icon: "Info",
    border: "border-l-4 border-blue-500",
    bg: "bg-blue-50/80 dark:bg-blue-900/10",
    text: "text-blue-800 dark:text-blue-200",
    label: "Info",
  },
  success: {
    icon: "CheckCircle",
    border: "border-l-4 border-green-500",
    bg: "bg-green-50/80 dark:bg-green-900/10",
    text: "text-green-800 dark:text-green-200",
    label: "Success",
  },
}

function getAlertComment(param, value, severity) {
  if ((param === "liquid_level" || param === "ultrasonic_liquid_level") && severity === "critical") {
    return "Tank is nearly empty. Schedule a refill right away."
  }
  if (param === "temperature" && severity === "critical") {
    return value > 50
      ? "Extremely high temperature! Shut down if possible."
      : "Temperature is above safe threshold. Take immediate action."
  }
  if (param === "humidity" && severity === "warning") {
    return "High humidity may cause condensation or mold. Check dehumidifiers."
  }
  if (param === "noise" && severity === "warning") {
    return "High noise may indicate a malfunctioning device. Inspect soon."
  }
  if ((param === "pm2_5" || param === "pm10") && severity === "warning") {
    return "Air quality is poor. Wear a mask or increase ventilation."
  }
  return "Monitor and address as soon as possible."
}

function generateAlertsFromAllDevices(allDevicesSensorData) {
  const alerts = []

  if (!allDevicesSensorData || typeof allDevicesSensorData !== "object") {
    return alerts
  }

  Object.entries(allDevicesSensorData).forEach(([deviceId, deviceData]) => {
    if (!deviceData || typeof deviceData !== "object" || !deviceData.values) {
      return
    }

    const { values: sensorValues, timestamp: createdAt } = deviceData

    Object.entries(sensorValues).forEach(([paramName, paramValue]) => {
      if (typeof paramValue !== "number" || isNaN(paramValue)) return

      // Temperature - Critical above 20°C
      if (paramName === "temperature" && paramValue > 20) {
        alerts.push({
          id: `temp-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "critical",
          createdAt,
          isRead: false,
        })
      }

      // Humidity - Warning above 60%
      if (paramName === "humidity" && paramValue > 60) {
        alerts.push({
          id: `hum-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "warning",
          createdAt,
          isRead: false,
        })
      }

      // Liquid level - Critical below 10
      if ((paramName === "liquid_level" || paramName === "ultrasonic_liquid_level") && paramValue < 10) {
        alerts.push({
          id: `liquid-low-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "critical",
          createdAt,
          isRead: false,
        })
      }

      // Noise - Warning above 80dB
      if (paramName === "noise" && paramValue > 80) {
        alerts.push({
          id: `noise-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "warning",
          createdAt,
          isRead: false,
        })
      }

      // PM2.5 - Warning above 35
      if (paramName === "pm2_5" && paramValue > 35) {
        alerts.push({
          id: `pm25-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "warning",
          createdAt,
          isRead: false,
        })
      }

      // PM10 - Warning above 80
      if (paramName === "pm10" && paramValue > 80) {
        alerts.push({
          id: `pm10-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "warning",
          createdAt,
          isRead: false,
        })
      }
    })
  })

  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || ""
  }
  return ""
}

export function useAlerts(userRole = "admin") {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAlerts = useCallback(async () => {
    const token = getAuthToken()
    if (!token) return

    try {
      setLoading(true)
      let sensorDataRes

      if (userRole === "admin") {
        sensorDataRes = await axios.get(`${baseurl}/api/devices/all-sensor-data`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        sensorDataRes = await axios.get(`${baseurl}/api/devices/my-devices-sensor-data`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      const dataById = {}
      if (sensorDataRes.data && Array.isArray(sensorDataRes.data.devices)) {
        sensorDataRes.data.devices.forEach((dev) => {
          if (dev && dev._id && dev.data) {
            dataById[dev._id] = {
              values: dev.data,
              timestamp: dev.timestamp || new Date().toISOString(),
            }
          }
        })
      }

      setAlerts(generateAlertsFromAllDevices(dataById))
    } catch (err) {
      console.error("[useAlerts] Error fetching alerts:", err)
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [userRole])

  const refreshAlerts = async () => {
    setRefreshing(true)
    await fetchAlerts()
    setRefreshing(false)
  }

  const markAsRead = (alertId) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, isRead: true } : alert)))
  }

  const dismissAlert = (alertId) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchAlerts])

  return {
    alerts,
    loading,
    refreshing,
    refreshAlerts,
    markAsRead,
    dismissAlert,
    PARAM_LABELS,
    SEVERITY,
    getAlertComment,
  }
}
