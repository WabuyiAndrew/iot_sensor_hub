"use client"

// Network status monitoring hook
import { useState, useEffect } from "react"

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState("unknown")
  const [effectiveType, setEffectiveType] = useState("unknown")

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    const updateConnectionInfo = () => {
      if ("connection" in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        if (connection) {
          setConnectionType(connection.type || "unknown")
          setEffectiveType(connection.effectiveType || "unknown")
        }
      }
    }

    // Initial check
    updateConnectionInfo()

    // Event listeners
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    // Connection change listener
    if ("connection" in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection) {
        connection.addEventListener("change", updateConnectionInfo)
      }
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)

      if ("connection" in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        if (connection) {
          connection.removeEventListener("change", updateConnectionInfo)
        }
      }
    }
  }, [])

  return {
    isOnline,
    connectionType,
    effectiveType,
    isSlowConnection: effectiveType === "slow-2g" || effectiveType === "2g",
  }
}
