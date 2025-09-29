"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const ConnectionStatus = ({ connectionStatus, onReconnect }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [lastStatus, setLastStatus] = useState(connectionStatus?.status)

  useEffect(() => {
    const status = connectionStatus?.status

    const shouldShow =
      status && ["connecting", "reconnecting", "failed", "auth-failed", "offline", "data-timeout"].includes(status)

    setIsVisible(shouldShow)

    // Track status changes
    if (status !== lastStatus) {
      setLastStatus(status)
    }
  }, [connectionStatus?.status, lastStatus])

  if (!isVisible) return null

  const getStatusConfig = () => {
    switch (connectionStatus?.status) {
      case "connecting":
        return {
          color: "bg-blue-500",
          icon: "🔄",
          title: "Connecting...",
          message: "Establishing connection to server",
        }
      case "reconnecting":
        return {
          color: "bg-yellow-500",
          icon: "🔄",
          title: "Reconnecting...",
          message: `Attempt ${connectionStatus.reconnectAttempts || 1} of 5`,
        }
      case "failed":
        return {
          color: "bg-red-500",
          icon: "❌",
          title: "Connection Failed",
          message: "Unable to connect to server",
        }
      case "auth-failed":
        return {
          color: "bg-red-500",
          icon: "🔐",
          title: "Authentication Failed",
          message: "Please refresh the page and try again",
        }
      case "offline":
        return {
          color: "bg-gray-500",
          icon: "📡",
          title: "Offline",
          message: "Check your internet connection",
        }
      case "data-timeout":
        return {
          color: "bg-orange-500",
          icon: "⏰",
          title: "Data Timeout",
          message: "Real-time data requests are timing out",
        }
      default:
        return {
          color: "bg-gray-500",
          icon: "❓",
          title: "Unknown Status",
          message: "Connection status unknown",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className={`${config.color} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm`}>
          <div className="flex items-center space-x-3">
            <span className="text-lg">{config.icon}</span>
            <div className="flex-1">
              <div className="font-semibold text-sm">{config.title}</div>
              <div className="text-xs opacity-90">{config.message}</div>
            </div>
            {(connectionStatus?.status === "failed" ||
              connectionStatus?.status === "auth-failed" ||
              connectionStatus?.status === "data-timeout") && (
              <button
                onClick={onReconnect}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-xs font-medium transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ConnectionStatus
