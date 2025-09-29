"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"

const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

// Parameter descriptions for user comprehension
const PARAM_LABELS = {
  temperature: { label: "Temperature", unit: "°C", action: "Check cooling/ventilation" },
  humidity: { label: "Humidity", unit: "%RH", action: "Monitor for condensation" },
  pm25: { label: "PM2.5", unit: "μg/m³", action: "Improve air filtration" },
  pm10: { label: "PM10", unit: "μg/m³", action: "Improve air filtration" },
  co2: { label: "CO2", unit: "ppm", action: "Improve ventilation" },
  atmosphericPressure: { label: "Atmospheric Pressure", unit: "hPa", action: "Monitor weather conditions" },
  windSpeed: { label: "Wind Speed", unit: "m/s", action: "Monitor weather conditions" },
  windDir: { label: "Wind Direction", unit: "°", action: "Monitor weather conditions" },
  rainfall: { label: "Rainfall", unit: "mm", action: "Monitor weather conditions" },
  totalSolarRadiation: { label: "Solar Radiation", unit: "W/m²", action: "Monitor solar conditions" },
  noise: { label: "Noise Level", unit: "dB", action: "Investigate noise sources" },
  ultrasonic_liquid_level: { label: "Ultrasonic Level", unit: "cm", action: "Check liquid levels" },
  pressure_level: { label: "Pressure Level", unit: "bar", action: "Check pressure systems" },
  liquid_level_raw: { label: "Raw Liquid Level", unit: "raw", action: "Check liquid levels" },
  signalStrength: { label: "Signal Strength", unit: "dBm", action: "Check device connectivity" },
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
  high: {
    icon: "AlertTriangle",
    border: "border-l-4 border-orange-500",
    bg: "bg-orange-50/80 dark:bg-orange-900/10",
    text: "text-orange-800 dark:text-orange-200",
    label: "High",
  },
  medium: {
    icon: "AlertTriangle",
    border: "border-l-4 border-yellow-400",
    bg: "bg-yellow-50/80 dark:bg-yellow-900/10",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "Medium",
  },
  low: {
    icon: "Info",
    border: "border-l-4 border-blue-500",
    bg: "bg-blue-50/80 dark:bg-blue-900/10",
    text: "text-blue-800 dark:text-blue-200",
    label: "Low",
  },
}

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || ""
  }
  return ""
}

// Create axios instance with auth
const createAxiosInstance = () => {
  const token = getAuthToken()
  return axios.create({
    baseURL: baseurl,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  })
}

export function useEnhancedAlerts(userRole = "admin") {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  const axiosInstance = createAxiosInstance()

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axiosInstance.get("/api/alerts")
      setAlerts(response.data.data || [])
    } catch (err) {
      console.error("[useEnhancedAlerts] Error fetching alerts:", err)
      setError(err.response?.data?.message || "Failed to fetch alerts")
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    if (userRole !== "admin") return

    try {
      const response = await axiosInstance.get("/api/alerts/stats")
      setStats(response.data.data)
    } catch (err) {
      console.error("[useEnhancedAlerts] Error fetching stats:", err)
    }
  }, [userRole])

  const refreshAlerts = async () => {
    setRefreshing(true)
    await fetchAlerts()
    await fetchStats()
    setRefreshing(false)
  }

  const acknowledgeAlert = async (alertId) => {
    try {
      await axiosInstance.put(`/api/alerts/${alertId}`, { status: "acknowledged" })
      await fetchAlerts()
      await fetchStats()
    } catch (err) {
      console.error("[useEnhancedAlerts] Error acknowledging alert:", err)
      setError(err.response?.data?.message || "Failed to acknowledge alert")
    }
  }

  const resolveAlert = async (alertId) => {
    try {
      await axiosInstance.put(`/api/alerts/${alertId}`, { status: "resolved" })
      await fetchAlerts()
      await fetchStats()
    } catch (err) {
      console.error("[useEnhancedAlerts] Error resolving alert:", err)
      setError(err.response?.data?.message || "Failed to resolve alert")
    }
  }

  const deleteAlert = async (alertId) => {
    if (userRole !== "admin") {
      setError("Only administrators can delete alerts")
      return
    }

    try {
      await axiosInstance.delete(`/api/alerts/${alertId}`)
      await fetchAlerts()
      await fetchStats()
    } catch (err) {
      console.error("[useEnhancedAlerts] Error deleting alert:", err)
      setError(err.response?.data?.message || "Failed to delete alert")
    }
  }

  // Get alert comment based on parameter and severity
  const getAlertComment = (parameter, value, severity, thresholdData) => {
    const paramInfo = PARAM_LABELS[parameter]
    if (!paramInfo) return "Monitor and address as soon as possible."

    if (parameter === "temperature") {
      if (severity === "critical") {
        return value > 50
          ? "Extremely high temperature! Shut down if possible."
          : "Temperature is critically high. Take immediate action."
      }
      return "Temperature is above safe threshold. Monitor closely."
    }

    if (parameter === "humidity" && severity === "high") {
      return "High humidity may cause condensation or mold. Check dehumidifiers."
    }

    if (parameter === "noise" && severity === "high") {
      return "High noise may indicate a malfunctioning device. Inspect soon."
    }

    if ((parameter === "pm25" || parameter === "pm10") && severity === "high") {
      return "Air quality is poor. Wear a mask or increase ventilation."
    }

    if (
      (parameter === "ultrasonic_liquid_level" || parameter === "pressure_level" || parameter === "liquid_level_raw") &&
      severity === "critical"
    ) {
      return "Tank is nearly empty. Schedule a refill right away."
    }

    if (parameter === "signalStrength" && severity === "high") {
      return "Device signal is weak. Check connectivity and positioning."
    }

    if (parameter === "co2" && severity === "critical") {
      return "CO2 levels are dangerously high. Improve ventilation immediately."
    }

    return paramInfo.action || "Monitor and address as soon as possible."
  }

  useEffect(() => {
    fetchAlerts()
    fetchStats()

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts()
      fetchStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchAlerts, fetchStats])

  return {
    alerts,
    loading,
    refreshing,
    error,
    stats,
    refreshAlerts,
    acknowledgeAlert,
    resolveAlert,
    deleteAlert,
    PARAM_LABELS,
    SEVERITY,
    getAlertComment,
    axiosInstance,
  }
}
