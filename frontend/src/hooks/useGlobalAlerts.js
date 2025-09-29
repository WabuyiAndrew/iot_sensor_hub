"use client"

// src/hooks/useGlobalAlerts.js
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useWebSocket } from "../App" // Assuming useWebSocket is exported from App.js
import { baseurl } from "../App"
import { toast } from "react-hot-toast"

export const useGlobalAlerts = (userInfo) => {
  const { isAuthenticated, axiosInstance } = useAuth()
  const { ws, isConnected } = useWebSocket()
  const [globalAlerts, setGlobalAlerts] = useState([])

  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated || !userInfo) {
      setGlobalAlerts([])
      return
    }
    try {
      const response = await axiosInstance.get(`${baseurl}/api/alerts`, {
        params: {
          limit: 100, // Fetch a reasonable number of recent active alerts
          status: "active", // Only active alerts
          // Backend's getAllAlerts handles role-based filtering, so no explicit userId param needed here
        },
      })
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setGlobalAlerts(response.data.data)
      }
    } catch (error) {
      console.error("[useGlobalAlerts] Error fetching alerts:", error)
      setGlobalAlerts([])
    }
  }, [isAuthenticated, userInfo, axiosInstance, baseurl])

  useEffect(() => {
    fetchAlerts() // Initial fetch
  }, [fetchAlerts])

  // WebSocket for real-time alerts
  useEffect(() => {
    if (isConnected && ws && userInfo) {
      const handleWsAlertMessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "system-alert" && data.payload) {
            const shouldShowAlert =
              userInfo?.role === "admin" ||
              userInfo?.devices?.some((d) => (d._id || d.id || d) === data.payload.deviceId)

            if (!shouldShowAlert) {
              console.log(
                `[useGlobalAlerts] Filtering out alert for device ${data.payload.deviceId} - not assigned to user`,
              )
              return
            }

            // Add new alert to the top, filter out duplicates if needed
            setGlobalAlerts((prevAlerts) => {
              // Basic deduplication if alert has an ID
              if (prevAlerts.some((alert) => alert._id === data.payload._id)) {
                return prevAlerts
              }
              // Add new alert to the top, keep a reasonable number
              const updatedAlerts = [data.payload, ...prevAlerts].slice(0, 100)
              return updatedAlerts
            })
            toast.error(`New Alert: ${data.payload.message}`) // Show toast for new alert
          }
        } catch (error) {
          console.error("Error parsing WebSocket alert message in useGlobalAlerts:", error)
        }
      }

      ws.addEventListener("message", handleWsAlertMessage)
      return () => ws.removeEventListener("message", handleWsAlertMessage)
    }
  }, [isConnected, ws, userInfo]) // Re-run if WebSocket connection or user info changes

  // Filter alerts for non-admin users
  const filteredAlerts =
    userInfo?.role === "admin"
      ? globalAlerts
      : globalAlerts.filter((alert) => userInfo?.devices?.some((d) => (d._id || d.id || d) === alert.deviceId))

  return { globalAlerts, filteredAlerts, fetchAlerts } // Export fetchAlerts if manual refresh is needed
}
