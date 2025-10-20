"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useWebSocket } from "../contexts/WebSocketContext"

export const useRealtimeChartData = (deviceId, parameters = [], options = {}) => {
  const {
    maxDataPoints = 50,
    updateInterval = 1000, // 1 second
    enableSmoothing = true,
    retentionTime = 3600000, // 1 hour
  } = options

  const { sendMessage, subscribe, isConnected } = useWebSocket()
  const [chartData, setChartData] = useState({})
  const [currentValues, setCurrentValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const dataBufferRef = useRef({})
  const updateTimerRef = useRef(null)

  // Initialize data buffers for each parameter
  useEffect(() => {
    parameters.forEach((param) => {
      if (!dataBufferRef.current[param]) {
        dataBufferRef.current[param] = []
      }
    })
  }, [parameters])

  const processNewData = useCallback(
    (sensorData) => {
      if (!sensorData || sensorData.deviceId !== deviceId) return

      const timestamp = new Date(sensorData.timestamp || Date.now())
      const now = Date.now()

      parameters.forEach((param) => {
        if (sensorData[param] !== undefined && sensorData[param] !== null) {
          const value = Number.parseFloat(sensorData[param])
          if (!isNaN(value)) {
            // Update current value immediately
            setCurrentValues((prev) => ({
              ...prev,
              [param]: value,
            }))

            // Add to data buffer
            if (!dataBufferRef.current[param]) {
              dataBufferRef.current[param] = []
            }

            const buffer = dataBufferRef.current[param]

            // Add new data point
            buffer.push({
              timestamp: timestamp.getTime(),
              value: value,
              x: timestamp,
              y: value,
            })

            // Remove old data points beyond retention time
            const cutoffTime = now - retentionTime
            dataBufferRef.current[param] = buffer.filter((point) => point.timestamp > cutoffTime)

            // Keep only max data points
            if (dataBufferRef.current[param].length > maxDataPoints) {
              dataBufferRef.current[param] = dataBufferRef.current[param].slice(-maxDataPoints)
            }

            // Apply smoothing if enabled
            if (enableSmoothing && dataBufferRef.current[param].length > 2) {
              const smoothedBuffer = applySmoothingFilter(dataBufferRef.current[param])
              dataBufferRef.current[param] = smoothedBuffer
            }
          }
        }
      })

      setLastUpdate(timestamp)
    },
    [deviceId, parameters, maxDataPoints, retentionTime, enableSmoothing],
  )

  const applySmoothingFilter = useCallback((data) => {
    if (data.length < 3) return data

    const smoothed = [...data]
    const windowSize = 3

    for (let i = 1; i < data.length - 1; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1)
      const window = data.slice(start, end)

      const sum = window.reduce((acc, point) => acc + point.value, 0)
      const avg = sum / window.length

      smoothed[i] = {
        ...data[i],
        value: avg,
        y: avg,
      }
    }

    return smoothed
  }, [])

  const updateChartData = useCallback(() => {
    const newChartData = {}

    parameters.forEach((param) => {
      if (dataBufferRef.current[param] && dataBufferRef.current[param].length > 0) {
        newChartData[param] = [...dataBufferRef.current[param]]
      }
    })

    setChartData(newChartData)
    setLoading(false)
  }, [parameters])

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "sensor-data" && message.data) {
        processNewData(message.data)
      }
    })

    return unsubscribe
  }, [subscribe, processNewData])

  useEffect(() => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current)
    }

    updateTimerRef.current = setInterval(() => {
      updateChartData()
    }, updateInterval)

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
      }
    }
  }, [updateChartData, updateInterval])

  // Request initial data
  useEffect(() => {
    if (isConnected && deviceId && parameters.length > 0) {
      sendMessage({
        type: "get_device_data",
        deviceId: deviceId,
        parameters: parameters,
        maxPoints: maxDataPoints,
        timestamp: Date.now(),
      })
    }
  }, [isConnected, deviceId, parameters, maxDataPoints, sendMessage])

  const getLastChartValue = useCallback(
    (parameter) => {
      const paramData = chartData[parameter]
      if (paramData && paramData.length > 0) {
        return paramData[paramData.length - 1].value
      }
      return currentValues[parameter] || null
    },
    [chartData, currentValues],
  )

  const isCurrentValueSynced = useCallback(
    (parameter) => {
      const currentValue = currentValues[parameter]
      const lastChartValue = getLastChartValue(parameter)

      if (currentValue === null || lastChartValue === null) return false

      // Allow small tolerance for floating point comparison
      const tolerance = 0.01
      return Math.abs(currentValue - lastChartValue) <= tolerance
    },
    [currentValues, getLastChartValue],
  )

  return {
    chartData,
    currentValues,
    loading,
    lastUpdate,
    isConnected,
    getLastChartValue,
    isCurrentValueSynced,
    dataPointsCount: Object.keys(chartData).reduce((acc, param) => {
      acc[param] = chartData[param]?.length || 0
      return acc
    }, {}),
  }
}
