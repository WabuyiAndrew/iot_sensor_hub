"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useWebSocket } from "../contexts/WebSocketContext"

export const useRealtimeData = (dataType, options = {}) => {
  const {
    cacheKey = `${dataType}_cache`,
    enablePersistence = false,
    requestThrottle = 10000, // 10 seconds default
    maxRetries = 3,
    fallbackData = null,
    deviceId = null, // Add device-specific support
  } = options

  const { sendMessage, subscribe, subscribeToDevice, isConnected, getCachedData, getDeviceSensorData, isDataStale } =
    useWebSocket()

  const [data, setData] = useState(fallbackData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const lastRequestRef = useRef(0)
  const timeoutRef = useRef(null)
  const retryTimeoutRef = useRef(null)

  const requestData = useCallback(() => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestRef.current

    if (timeSinceLastRequest < requestThrottle) {
      const remainingTime = requestThrottle - timeSinceLastRequest
      console.log(`[andy] 🔄 Throttling ${dataType} request. ${Math.ceil(remainingTime / 1000)}s remaining`)
      return
    }

    if (!isConnected) {
      console.warn(`[andy] ⚠️ Cannot request ${dataType}: WebSocket not connected`)
      setError("WebSocket not connected")
      return
    }

    console.log(`[andy] 🔄 Requesting fresh data for: ${dataType}${deviceId ? ` (device: ${deviceId})` : ""}`)
    lastRequestRef.current = now
    setLoading(true)
    setError(null)

    const requestMessage = {
      type: "get_data",
      dataType: dataType,
      timestamp: now,
      requestId: `${dataType}_${now}`,
    }

    if (deviceId) {
      requestMessage.deviceId = deviceId
      requestMessage.target = `device:${deviceId}`
    }

    // Send data request via WebSocket
    sendMessage(requestMessage)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      console.warn(`[andy] ⏰ Data request timeout for ${dataType}`)
      setLoading(false)

      if (retryCount < maxRetries) {
        console.log(`[andy] 🔄 Retrying ${dataType} request (${retryCount + 1}/${maxRetries})`)
        setRetryCount((prev) => prev + 1)

        retryTimeoutRef.current = setTimeout(
          () => {
            requestData()
          },
          2000 * (retryCount + 1),
        ) // Exponential backoff
      } else {
        setError(`Request timeout after ${maxRetries} retries`)

        let cachedData = null
        if (deviceId) {
          cachedData = getDeviceSensorData(deviceId)
        }

        if (!cachedData) {
          cachedData = getCachedData(cacheKey)
        }

        if (cachedData && !isDataStale(cacheKey, 300000)) {
          console.log(`[andy] 📦 Using cached data for ${dataType}`)
          setData(cachedData)
          setLastUpdate(new Date(cachedData.timestamp || cachedData.receivedAt || Date.now()))
        }
      }
    }, 8000) // 8 second timeout
  }, [
    dataType,
    deviceId,
    isConnected,
    sendMessage,
    requestThrottle,
    retryCount,
    maxRetries,
    getCachedData,
    getDeviceSensorData,
    isDataStale,
    cacheKey,
  ])

  useEffect(() => {
    let unsubscribe = () => {}

    if (deviceId && dataType === "sensor_data") {
      // Use device-specific subscription for sensor data
      unsubscribe = subscribeToDevice(deviceId, (sensorData) => {
        console.log(`[andy] ✅ Received device sensor data for ${deviceId}:`, sensorData)

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }

        setData(sensorData)
        setLoading(false)
        setError(null)
        setLastUpdate(new Date())
        setRetryCount(0)

        if (enablePersistence && sensorData) {
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: sensorData,
                timestamp: Date.now(),
              }),
            )
          } catch (err) {
            console.warn(`[andy] Failed to cache ${dataType}:`, err)
          }
        }
      })
    } else {
      // Use general subscription for other data types
      unsubscribe = subscribe((message) => {
        if (message.type === "data_response" && message.dataType === dataType) {
          console.log(`[andy] ✅ Received data for ${dataType}:`, message.data)

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }

          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
            retryTimeoutRef.current = null
          }

          setData(message.data)
          setLoading(false)
          setError(null)
          setLastUpdate(new Date())
          setRetryCount(0)

          if (enablePersistence && message.data) {
            try {
              localStorage.setItem(
                cacheKey,
                JSON.stringify({
                  data: message.data,
                  timestamp: Date.now(),
                }),
              )
            } catch (err) {
              console.warn(`[andy] Failed to cache ${dataType}:`, err)
            }
          }
        }

        if (message.type === "data_error" && message.dataType === dataType) {
          console.error(`[andy] ❌ Data error for ${dataType}:`, message.error)
          setLoading(false)
          setError(message.error || "Data request failed")

          const cachedData = getCachedData(cacheKey)
          if (cachedData) {
            console.log(`[andy] 📦 Using cached data due to error for ${dataType}`)
            setData(cachedData)
            setLastUpdate(new Date(cachedData.timestamp || Date.now()))
          }
        }
      })
    }

    return unsubscribe
  }, [subscribe, subscribeToDevice, dataType, deviceId, enablePersistence, cacheKey, getCachedData])

  useEffect(() => {
    if (isConnected) {
      // Check for cached data first
      let cachedData = null

      if (deviceId && dataType === "sensor_data") {
        cachedData = getDeviceSensorData(deviceId)
      }

      if (!cachedData && enablePersistence) {
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const parsedCache = JSON.parse(cached)
            const isStale = Date.now() - parsedCache.timestamp > 300000 // 5 minutes

            if (!isStale) {
              cachedData = parsedCache.data
            }
          }
        } catch (err) {
          console.warn(`[andy] Failed to load cached ${dataType}:`, err)
        }
      }

      if (cachedData) {
        console.log(`[andy] 📦 Using cached data for ${dataType}`)
        setData(cachedData)
        setLoading(false)
        setLastUpdate(new Date(cachedData.timestamp || cachedData.receivedAt || Date.now()))
        return
      }

      // Request fresh data
      const timer = setTimeout(() => {
        requestData()
      }, 500) // Small delay to ensure WebSocket is ready

      return () => clearTimeout(timer)
    } else {
      setLoading(false)
      if (!data && enablePersistence) {
        // Try to load cached data when offline
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const parsedCache = JSON.parse(cached)
            console.log(`[andy] 📦 Loading cached data for ${dataType} (offline)`)
            setData(parsedCache.data)
            setLastUpdate(new Date(parsedCache.timestamp))
          }
        } catch (err) {
          console.warn(`[andy] Failed to load cached ${dataType} when offline:`, err)
        }
      }
    }
  }, [isConnected, dataType, deviceId, enablePersistence, cacheKey, requestData, getDeviceSensorData])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const refresh = useCallback(() => {
    console.log(`[andy] 🔄 Manual refresh requested for ${dataType}`)
    setRetryCount(0)
    setError(null)
    lastRequestRef.current = 0 // Reset throttle
    requestData()
  }, [requestData])

  return {
    data,
    loading,
    error,
    lastUpdate,
    isConnected,
    refresh,
    connectionStatus: isConnected ? "connected" : "disconnected",
  }
}
