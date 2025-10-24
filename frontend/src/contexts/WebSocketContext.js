"use client"

import { useState, useEffect, createContext, useContext, useRef, useCallback } from "react"
import { useAuth } from "./AuthContext" // Import the useAuth hook

const WebSocketContext = createContext(null)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth()
  const connectionDebounceRef = useRef(null)
  const isConnectingRef = useRef(false)
  const isAuthenticatedRef = useRef(false)
  const authTimeoutRef = useRef(null)

  const circuitBreakerRef = useRef({
    failures: 0,
    lastFailureTime: null,
    state: "CLOSED", // CLOSED, OPEN, HALF_OPEN
    openUntil: null,
  })

  const persistentDataRef = useRef({
    sensorData: new Map(), // deviceId -> latest sensor data
    deviceStatuses: new Map(), // deviceId -> status
    alerts: [],
    tankVolumes: new Map(), // tankId -> volume data
    lastUpdated: new Map(), // dataType -> timestamp
  })

  const deviceSubscribersRef = useRef(new Map()) // deviceId -> Set of callbacks

  const [connectionStatus, setConnectionStatus] = useState({
    status: "disconnected",
    reconnectAttempts: 0,
    lastMessageTime: null,
    messageCount: 0,
  })

  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const heartbeatTimerRef = useRef(null)
  const isManualCloseRef = useRef(false)
  const connectionAttemptsRef = useRef(0)
  const offlineQueueRef = useRef([])
  const messageHandlersRef = useRef(new Set())
  const updateCallbacksRef = useRef(new Set())

  const maxReconnectAttempts = 3 // Reduced from 5 to prevent spam
  const baseReconnectDelay = 10000 // Increased from 5000ms to 10000ms
  const maxReconnectDelay = 60000 // Increased from 30000ms to 60000ms

  const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5
  const CIRCUIT_BREAKER_TIMEOUT = 300000 // 5 minutes
  const CIRCUIT_BREAKER_HALF_OPEN_TIMEOUT = 60000 // 1 minute

  const checkCircuitBreaker = useCallback(() => {
    const now = Date.now()
    const breaker = circuitBreakerRef.current

    if (breaker.state === "OPEN") {
      if (now > breaker.openUntil) {
        console.log("Circuit breaker moving to HALF_OPEN state")
        breaker.state = "HALF_OPEN"
        return true
      }
      console.log("Circuit breaker is OPEN, blocking connection attempt")
      setConnectionStatus((prev) => ({ ...prev, status: "circuit-breaker-open" }))
      return false
    }

    return true
  }, [])

  const recordCircuitBreakerFailure = useCallback(() => {
    const breaker = circuitBreakerRef.current
    breaker.failures++
    breaker.lastFailureTime = Date.now()

    console.log(`Circuit breaker failure recorded: ${breaker.failures}/${CIRCUIT_BREAKER_FAILURE_THRESHOLD}`)

    if (breaker.failures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      breaker.state = "OPEN"
      breaker.openUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT
      console.log(`Circuit breaker OPENED for ${CIRCUIT_BREAKER_TIMEOUT / 1000} seconds`)
      setConnectionStatus((prev) => ({ ...prev, status: "circuit-breaker-open" }))
    }
  }, [])

  const recordCircuitBreakerSuccess = useCallback(() => {
    const breaker = circuitBreakerRef.current
    if (breaker.state === "HALF_OPEN") {
      console.log("Circuit breaker moving to CLOSED state after successful connection")
      breaker.state = "CLOSED"
    }
    breaker.failures = 0
    breaker.lastFailureTime = null
  }, [])

  const cleanupConnection = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current)
      authTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    isConnectingRef.current = false
    isAuthenticatedRef.current = false
    setConnectionStatus({
      status: "disconnected",
      reconnectAttempts: 0,
      lastMessageTime: null,
      messageCount: 0,
    })
  }, [])

  const connectWebSocket = useCallback(() => {
    if (!checkCircuitBreaker()) {
      return
    }

    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket connection attempt blocked - already connecting or connected")
      return
    }

    if (!token || !isAuthenticated || !user) {
      console.warn("🚫 WebSocket connection skipped: No token, user, or not authenticated.")
      console.log("Auth state:", { hasToken: !!token, isAuthenticated, hasUser: !!user })
      setConnectionStatus((prev) => ({ ...prev, status: "disconnected" }))
      return
    }

    if (!token || token.length < 10) {
      console.error("❌ Invalid token format - too short or missing")
      setConnectionStatus((prev) => ({ ...prev, status: "disconnected" }))
      return
    }

    console.log("Token validation - Length:", token?.length, "Starts with:", token?.substring(0, 10))
    console.log("User object for WebSocket auth:", {
      hasUser: !!user,
      userId: user?._id || user?.id,
      username: user?.username,
      userKeys: user ? Object.keys(user) : [],
    })

    isConnectingRef.current = true
    isManualCloseRef.current = false
    isAuthenticatedRef.current = false
    setConnectionStatus((prev) => ({ ...prev, status: "connecting" }))

    const wsUrl = `ws://localhost:5050`
    console.log("Attempting WebSocket connection to:", wsUrl)
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log("🔌 WebSocket connection established")
      console.log("WebSocket readyState:", wsRef.current.readyState)
      console.log("WebSocket protocol:", wsRef.current.protocol)
      console.log("WebSocket extensions:", wsRef.current.extensions)
      isConnectingRef.current = false

      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          console.log("WebSocket still open after delay, proceeding with auth...")
          console.log("Sending authentication message...")

          const authMessage = {
            type: "auth",
            token: token,
            userId: user?._id || user?.id, // Prioritize _id over id for MongoDB
            timestamp: Date.now(),
          }

          console.log("Auth message being sent:", {
            type: authMessage.type,
            tokenExists: !!token,
            tokenLength: token?.length,
            tokenStart: token?.substring(0, 20) + "...",
            userId: authMessage.userId,
            timestamp: authMessage.timestamp,
          })

          const messageString = JSON.stringify(authMessage)
          console.log("Serialized auth message length:", messageString.length)
          console.log("Serialized auth message preview:", messageString.substring(0, 100) + "...")

          try {
            console.log("About to send auth message via WebSocket...")
            wsRef.current.send(messageString)
            console.log("✅ Auth message sent successfully to backend")
            console.log("WebSocket bufferedAmount after send:", wsRef.current.bufferedAmount)
          } catch (error) {
            console.error("❌ Failed to send auth message:", error)
            console.error("Error details:", error.message, error.stack)
            recordCircuitBreakerFailure()
            wsRef.current.close(3008, "Failed to send auth message")
            return
          }

          authTimeoutRef.current = setTimeout(() => {
            if (!isAuthenticatedRef.current) {
              console.error("❌ Authentication timeout - closing connection after 60 seconds")
              console.log("Auth state at timeout:", {
                isAuthenticated: isAuthenticatedRef.current,
                wsState: wsRef.current?.readyState,
                wsBufferedAmount: wsRef.current?.bufferedAmount,
                token: token?.substring(0, 20) + "...",
                connectionTime: Date.now() - authMessage.timestamp,
              })
              console.log("[[andy] No auth-success or auth-error message received from backend")
              recordCircuitBreakerFailure()
              wsRef.current.close(3008, "Authentication timeout")
            }
          }, 60000) // Increased from 35 seconds to 60 seconds
        } else {
          console.error("[[andy] WebSocket not open when trying to send auth message")
          console.log("[[andy] WebSocket readyState:", wsRef.current?.readyState)
          recordCircuitBreakerFailure()
        }
      }, 2000) // Increased delay from 500ms to 2000ms for slow backend
    }

    wsRef.current.onmessage = (event) => {
      console.log("[[andy] Raw WebSocket message received:", event.data)
      console.log("[[andy] Message type:", typeof event.data)
      console.log("[[andy] Message length:", event.data?.length)

      try {
        const message = JSON.parse(event.data)
        console.log("[[andy] Parsed WebSocket message:", message)
        console.log("[[andy] Message type field:", message.type)

        if (message.type === "auth-success") {
          console.log("✅ WebSocket authentication successful")
          console.log("[[andy] Auth success message details:", message)
          isAuthenticatedRef.current = true
          connectionAttemptsRef.current = 0
          recordCircuitBreakerSuccess()
          setConnectionStatus((prev) => ({ ...prev, status: "connected" }))

          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current)
            authTimeoutRef.current = null
            console.log("[[andy] Cleared auth timeout after successful authentication")
          }

          heartbeatTimerRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              try {
                wsRef.current.send(JSON.stringify({ type: "ping", timestamp: Date.now() }))
                console.log("[[andy] Heartbeat ping sent")
              } catch (error) {
                console.error("[[andy] Failed to send heartbeat:", error)
              }
            }
          }, 30000)

          while (offlineQueueRef.current.length > 0) {
            const queuedMessage = offlineQueueRef.current.shift()
            try {
              wsRef.current.send(JSON.stringify(queuedMessage))
              console.log("[[andy] Sent queued message:", queuedMessage.type)
            } catch (error) {
              console.error("[[andy] Failed to send queued message:", error)
            }
          }

          return
        }

        if (message.type === "auth-error") {
          console.error("❌ WebSocket authentication failed:", message.message)
          console.log("[andy] Auth error details:", message)
          console.log("[andy] Full auth error object:", JSON.stringify(message, null, 2))
          recordCircuitBreakerFailure()
          wsRef.current.close(3008, "Authentication failed")
          return
        }

        if (message.type === "welcome") {
          console.log("[andy] 👋 Received welcome message from backend:", message)
          console.log("[andy] Backend is responding, connection established")
          return
        }

        if (message.type === "pong") {
          console.log("[[andy] 🏓 Received pong from backend")
          return
        }

        // Handle analytics responses
        if (message.type === "analytics_response") {
          console.log(`📊 [WebSocket] Received analytics response:`, message)
          // Notify analytics subscribers
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler(message)
            } catch (error) {
              console.error("Error in analytics response handler:", error)
            }
          })
          return
        }

        if (message.type === "analytics_error") {
          console.error(`❌ [WebSocket] Analytics error:`, message.message)
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler(message)
            } catch (error) {
              console.error("Error in analytics error handler:", error)
            }
          })
          return
        }

        // Handle sensor data responses
        if (message.type === "sensor_data_response") {
          console.log(`📊 [WebSocket] Received sensor data response:`, message)
          const deviceId = message.data?.deviceId
          if (deviceId) {
            persistentDataRef.current.sensorData.set(deviceId, {
              ...message.data,
              timestamp: message.timestamp || new Date().toISOString(),
              receivedAt: Date.now(),
            })
            persistentDataRef.current.lastUpdated.set(`sensor_${deviceId}`, Date.now())

            // Notify device-specific subscribers
            const deviceCallbacks = deviceSubscribersRef.current.get(deviceId)
            if (deviceCallbacks) {
              deviceCallbacks.forEach((callback) => {
                try {
                  callback(message.data)
                } catch (error) {
                  console.error(`Error in device callback for ${deviceId}:`, error)
                }
              })
            }
          }
          return
        }
        if (!isAuthenticatedRef.current) {
          console.warn("⚠️ Received message before authentication:", message)
          console.log("[andy] Current auth state:", isAuthenticatedRef.current)
          console.log("[andy] Message received while waiting for auth:", message.type)
          return
        }

        if (message.type === "sensor-data" && message.data) {
          const deviceId = message.data.deviceId || message.data.device?._id
          if (deviceId) {
            console.log(`📊 [WebSocket] Received sensor data for device ${deviceId}:`, message.data)

            // Update persistent data cache
            persistentDataRef.current.sensorData.set(deviceId, {
              ...message.data,
              timestamp: message.timestamp || new Date().toISOString(),
              receivedAt: Date.now(),
            })
            persistentDataRef.current.lastUpdated.set(`sensor_${deviceId}`, Date.now())

            // Notify device-specific subscribers
            const deviceCallbacks = deviceSubscribersRef.current.get(deviceId)
            if (deviceCallbacks) {
              deviceCallbacks.forEach((callback) => {
                try {
                  callback(message.data)
                } catch (error) {
                  console.error(`[WebSocket] Error in device callback for ${deviceId}:`, error)
                }
              })
            }
          }
        }

        if (message.type === "tank-volume-update" && message.data) {
          const tankId = message.data.tankId
          const deviceId = message.data.deviceId
          if (tankId) {
            persistentDataRef.current.tankVolumes.set(tankId, {
              ...message.data,
              timestamp: message.timestamp || new Date().toISOString(),
              receivedAt: Date.now(),
            })
            persistentDataRef.current.lastUpdated.set(`tank_${tankId}`, Date.now())
          }
        }

        if (message.type === "device-status" && message.data) {
          const deviceId = message.data.deviceId || message.data._id
          if (deviceId) {
            persistentDataRef.current.deviceStatuses.set(deviceId, {
              ...message.data,
              timestamp: message.timestamp || new Date().toISOString(),
              receivedAt: Date.now(),
            })
            persistentDataRef.current.lastUpdated.set(`status_${deviceId}`, Date.now())
          }
        }

        setConnectionStatus((prev) => ({
          ...prev,
          lastMessageTime: new Date(),
          messageCount: prev.messageCount + 1,
        }))

        messageHandlersRef.current.forEach((handler) => {
          if (typeof handler === "function") {
            try {
              handler(message)
            } catch (error) {
              console.error("[andy] Error in message handler:", error)
            }
          } else {
            console.warn("⚠️ Found a non-function listener in the WebSocket message handlers.")
          }
        })
      } catch (error) {
        console.error("❌ Failed to parse WebSocket message:", error, "Raw data:", event.data)
        console.error("Parse error details:", error.message)
      }
    }

    wsRef.current.onclose = (event) => {
      console.log(`🔌 WebSocket disconnected (Code: ${event.code}, Reason: ${event.reason})`)
      isConnectingRef.current = false
      isAuthenticatedRef.current = false
      clearInterval(heartbeatTimerRef.current)

      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current)
        authTimeoutRef.current = null
      }

      if (event.code === 1000 || event.code === 1001) {
        setConnectionStatus((prev) => ({ ...prev, status: "disconnected" }))
        console.log("ℹ️ Clean disconnection, not attempting to reconnect.")
        return
      }

      if (event.code === 3008) {
        setConnectionStatus((prev) => ({ ...prev, status: "auth-failed" }))
        console.log("❌ Authentication failed, not attempting to reconnect.")
        recordCircuitBreakerFailure()
        return
      }

      recordCircuitBreakerFailure()

      if (connectionAttemptsRef.current < maxReconnectAttempts) {
        connectionAttemptsRef.current++
        const jitter = Math.random() * 1000
        const delay = Math.min(
          baseReconnectDelay * Math.pow(2, connectionAttemptsRef.current - 1) + jitter,
          maxReconnectDelay,
        )
        console.log(
          `🔄 Attempting to reconnect (${connectionAttemptsRef.current}/${maxReconnectAttempts}) in ${Math.round(delay)}ms`,
        )
        setConnectionStatus((prev) => ({
          ...prev,
          status: "reconnecting",
          reconnectAttempts: connectionAttemptsRef.current,
        }))
        reconnectTimerRef.current = setTimeout(connectWebSocket, delay)
      } else {
        setConnectionStatus((prev) => ({ ...prev, status: "failed" }))
        console.error("❌ Failed to reconnect after maximum attempts.")
      }
    }

    wsRef.current.onerror = (error) => {
      console.error("❌ WebSocket error:", error)
      recordCircuitBreakerFailure()
    }
  }, [token, isAuthenticated, user, checkCircuitBreaker, recordCircuitBreakerFailure, recordCircuitBreakerSuccess])

  useEffect(() => {
    console.log("WebSocket useEffect triggered with:", {
      hasToken: !!token,
      isAuthenticated,
      hasUser: !!user,
      currentStatus: connectionStatus.status,
      wsState: wsRef.current?.readyState,
    })

    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current)
    }

    connectionDebounceRef.current = setTimeout(() => {
      if (token && isAuthenticated && user) {
        console.log("🚀 All auth conditions met, attempting WebSocket connection")
        if (connectionStatus.status === "disconnected" || connectionStatus.status === "failed") {
          connectWebSocket()
        } else {
          console.log("WebSocket already connecting/connected, status:", connectionStatus.status)
        }
      } else if (!token || !isAuthenticated || !user) {
        console.log("🛑 Auth state invalid, cleaning up WebSocket connection")
        cleanupConnection()
      }
    }, 200) // Reduced debounce time for faster connection attempts

    return () => {
      if (connectionDebounceRef.current) {
        clearTimeout(connectionDebounceRef.current)
      }
    }
  }, [token, isAuthenticated, user, connectWebSocket, cleanupConnection]) // Removed connectionStatus.status from dependencies to prevent loops

  const subscribe = useCallback((handler) => {
    if (typeof handler !== "function") {
      console.error("❌ WebSocket subscribe: handler must be a function")
      return () => { }
    }
    messageHandlersRef.current.add(handler)
    return () => {
      messageHandlersRef.current.delete(handler)
    }
  }, [])

  const addUpdateCallback = useCallback((callback) => {
    updateCallbacksRef.current.add(callback)
  }, [])

  const removeUpdateCallback = useCallback((callback) => {
    updateCallbacksRef.current.delete(callback)
  }, [])

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      try {
        wsRef.current.send(JSON.stringify(message))
        console.log("[andy] Message sent:", message.type)
      } catch (error) {
        console.error("[andy] Failed to send message:", error)
      }
    } else {
      console.warn("⚠️ WebSocket not authenticated. Message queued:", message.type)
      offlineQueueRef.current.push(message)
    }
  }, [])

  const manualReconnect = useCallback(() => {
    console.log("🔄 Manually requesting a WebSocket reconnection...")
    circuitBreakerRef.current = {
      failures: 0,
      lastFailureTime: null,
      state: "CLOSED",
      openUntil: null,
    }
    cleanupConnection()
    connectionAttemptsRef.current = 0
    setTimeout(() => {
      connectWebSocket()
    }, 1000)
  }, [cleanupConnection, connectWebSocket])

  const subscribeToDevice = useCallback(
    (deviceId, callback) => {
      if (!deviceId || typeof callback !== "function") {
        console.error("❌ subscribeToDevice: deviceId and callback are required")
        return () => { }
      }

      console.log(`📡 [WebSocket] Subscribing to device updates: ${deviceId}`)

      if (!deviceSubscribersRef.current.has(deviceId)) {
        deviceSubscribersRef.current.set(deviceId, new Set())
      }

      deviceSubscribersRef.current.get(deviceId).add(callback)

      // Send subscription message to server if connected
      if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        sendMessage({
          type: "subscribe",
          target: `device:${deviceId}`,
          timestamp: Date.now(),
        })
      }

      return () => {
        const callbacks = deviceSubscribersRef.current.get(deviceId)
        if (callbacks) {
          callbacks.delete(callback)
          if (callbacks.size === 0) {
            deviceSubscribersRef.current.delete(deviceId)
            // Send unsubscribe message
            if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
              sendMessage({
                type: "unsubscribe",
                target: `device:${deviceId}`,
                timestamp: Date.now(),
              })
            }
          }
        }
      }
    },
    [sendMessage],
  )

  // Request latest analytics for a device
  const requestLatestAnalytics = useCallback(
    (serialNumber) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        const message = {
          type: "request_latest_analytics",
          serialNumber: serialNumber,
          timestamp: Date.now(),
        }

        console.log(`📊 [WebSocket] Requesting latest analytics for device: ${serialNumber}`)
        sendMessage(message)
      } else {
        console.warn("⚠️ WebSocket not connected, cannot request analytics")
      }
    },
    [sendMessage],
  )

  // Request sensor data for a device
  const requestSensorData = useCallback(
    (deviceId, params = {}) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        const message = {
          type: "request_sensor_data",
          deviceId: deviceId,
          params: params,
          timestamp: Date.now(),
        }

        console.log(`📊 [WebSocket] Requesting sensor data for device: ${deviceId}`)
        sendMessage(message)
      } else {
        console.warn("⚠️ WebSocket not connected, cannot request sensor data")
      }
    },
    [sendMessage],
  )

  /**
   * @description Retrieves the cached sensor data for a specific device.
   * @param {string} deviceId The ID of the device.
   * @returns {object | null} The latest sensor data object or null.
   */
  const getDeviceSensorData = useCallback((deviceId) => {
    // persistentDataRef.current.sensorData is a Map: deviceId -> { data, timestamp, receivedAt }
    const cachedEntry = persistentDataRef.current.sensorData.get(deviceId)

    // Return the main data object if the entry exists, otherwise null
    return cachedEntry?.data || null
  }, [])

  const getDeviceStatus = useCallback((deviceId) => {
    return persistentDataRef.current.deviceStatuses.get(deviceId) || null
  }, [])

  const getTankVolumeData = useCallback((tankId) => {
    return persistentDataRef.current.tankVolumes.get(tankId) || null
  }, [])

  const getCachedData = useCallback((key) => {
    // Support both old format and new Map-based format
    if (key.startsWith("sensor_")) {
      const deviceId = key.replace("sensor_", "")
      // NOTE: getCachedData returns the entire cached object { data, timestamp, receivedAt }
      return persistentDataRef.current.sensorData.get(deviceId)
    }
    if (key.startsWith("status_")) {
      const deviceId = key.replace("status_", "")
      return persistentDataRef.current.deviceStatuses.get(deviceId)
    }
    if (key.startsWith("tank_")) {
      const tankId = key.replace("tank_", "")
      return persistentDataRef.current.tankVolumes.get(tankId)
    }
    // Fallback to old format (not used with the current structure)
    // return persistentDataRef.current[key] 
    return null
  }, [])

  const isDataStale = useCallback((key, maxAge = 5 * 60 * 1000) => {
    const lastUpdate = persistentDataRef.current.lastUpdated.get(key)
    if (!lastUpdate) return true
    return Date.now() - lastUpdate > maxAge
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      console.log("[WebSocketContext] Network back online, attempting to reconnect...")
      if (connectionStatus.status === "disconnected" || connectionStatus.status === "failed") {
        connectionAttemptsRef.current = 0
        setTimeout(() => {
          connectWebSocket()
        }, 2000) // Wait 2 seconds after coming online
      }
    }

    const handleOffline = () => {
      console.log("[WebSocketContext] Network went offline")
      setConnectionStatus((prev) => ({ ...prev, status: "offline" }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [connectionStatus.status, connectWebSocket])

  useEffect(() => {
    return () => {
      cleanupConnection()
    }
  }, [cleanupConnection])

  const wsContextValue = {
    connectionStatus,
    sendMessage,
    subscribe,
    subscribeToDevice, // Add device-specific subscription
    requestLatestAnalytics, // Add analytics request function
    requestSensorData, // Add sensor data request function

    addUpdateCallback,
    removeUpdateCallback,
    getCachedData,
    getDeviceSensorData, // ✅ Now implemented and exported
    getDeviceStatus,
    getTankVolumeData,
    isDataStale,
    manualReconnect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current,
    circuitBreakerStatus: circuitBreakerRef.current,
  }

  return <WebSocketContext.Provider value={wsContextValue}>{children}</WebSocketContext.Provider>
}

export { WebSocketContext }