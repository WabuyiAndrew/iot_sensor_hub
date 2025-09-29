// import { useState, useEffect, useCallback, useRef } from 'react'
// import { toast } from 'react-hot-toast'

// export const useRealTimeCharts = (deviceId, ws, isConnected, options = {}) => {
//   const {
//     maxDataPoints = 50,
//     updateInterval = 1000,
//     enableHeartbeat = true,
//     enableSmoothing = true,
//     bufferSize = 100
//   } = options

//   const [realtimeData, setRealtimeData] = useState({})
//   const [dataProcessingRate, setDataProcessingRate] = useState(0)
//   const [lastUpdateTime, setLastUpdateTime] = useState(null)
//   const [isProcessing, setIsProcessing] = useState(false)
//   const [heartbeatActive, setHeartbeatActive] = useState(false)
  
//   const dataBufferRef = useRef(new Map())
//   const processingStatsRef = useRef({
//     totalUpdates: 0,
//     lastMinuteUpdates: 0,
//     updateTimes: []
//   })
//   const heartbeatIntervalRef = useRef(null)

//   // Heartbeat animation effect
//   useEffect(() => {
//     if (enableHeartbeat && isConnected) {
//       heartbeatIntervalRef.current = setInterval(() => {
//         setHeartbeatActive(true)
//         setTimeout(() => setHeartbeatActive(false), 200)
//       }, 2000)
//     }

//     return () => {
//       if (heartbeatIntervalRef.current) {
//         clearInterval(heartbeatIntervalRef.current)
//       }
//     }
//   }, [enableHeartbeat, isConnected])

//   // Data smoothing function
//   const smoothData = useCallback((newValue, previousValues, smoothingFactor = 0.3) => {
//     if (!enableSmoothing || previousValues.length === 0) return newValue
    
//     const recentValues = previousValues.slice(-5)
//     const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length
//     return average * (1 - smoothingFactor) + newValue * smoothingFactor
//   }, [enableSmoothing])

//   // Process incoming data
//   const processIncomingData = useCallback((sensorData) => {
//     setIsProcessing(true)
//     const timestamp = new Date().toISOString()
    
//     // Update processing stats
//     processingStatsRef.current.totalUpdates++
//     processingStatsRef.current.updateTimes.push(Date.now())
    
//     // Keep only last minute of update times for rate calculation
//     const oneMinuteAgo = Date.now() - 60000
//     processingStatsRef.current.updateTimes = processingStatsRef.current.updateTimes.filter(
//       time => time > oneMinuteAgo
//     )
    
//     setDataProcessingRate(processingStatsRef.current.updateTimes.length)
//     setLastUpdateTime(timestamp)

//     // Process each parameter
//     Object.entries(sensorData).forEach(([paramName, value]) => {
//       if (typeof value === 'number' && !isNaN(value)) {
//         // Get or create buffer for this parameter
//         if (!dataBufferRef.current.has(paramName)) {
//           dataBufferRef.current.set(paramName, [])
//         }
        
//         const buffer = dataBufferRef.current.get(paramName)
//         const previousValues = buffer.map(item => item.value)
        
//         // Apply smoothing if enabled
//         const smoothedValue = smoothData(value, previousValues)
        
//         // Add new data point
//         const dataPoint = {
//           timestamp,
//           value: smoothedValue,
//           rawValue: value,
//           displayTimestamp: new Date().toLocaleTimeString('en-US', { 
//             hour: '2-digit', 
//             minute: '2-digit',
//             second: '2-digit'
//           })
//         }
        
//         buffer.push(dataPoint)
        
//         // Maintain buffer size
//         if (buffer.length > bufferSize) {
//           buffer.shift()
//         }
        
//         // Update realtime data for charts
//         setRealtimeData(prev => ({
//           ...prev,
//           [paramName]: buffer.slice(-maxDataPoints)
//         }))
//       }
//     })

//     setTimeout(() => setIsProcessing(false), 100)
//   }, [smoothData, maxDataPoints, bufferSize])

//   // WebSocket message handler
//   useEffect(() => {
//     if (!ws || !isConnected) return

//     const handleMessage = (event) => {
//       try {
//         const data = JSON.parse(event.data)
//         if (data.type === 'sensor-data' && data.data?.deviceId === deviceId) {
//           processIncomingData(data.data)
//         }
//       } catch (error) {
//         console.error('Error processing WebSocket message:', error)
//       }
//     }

//     ws.addEventListener('message', handleMessage)
//     return () => ws.removeEventListener('message', handleMessage)
//   }, [ws, isConnected, deviceId, processIncomingData])

//   // Get chart data for a specific parameter
//   const getChartData = useCallback((paramName) => {
//     return realtimeData[paramName] || []
//   }, [realtimeData])

//   // Clear data for a parameter
//   const clearParameterData = useCallback((paramName) => {
//     dataBufferRef.current.delete(paramName)
//     setRealtimeData(prev => {
//       const newData = { ...prev }
//       delete newData[paramName]
//       return newData
//     })
//   }, [])

//   // Reset all data
//   const resetAllData = useCallback(() => {
//     dataBufferRef.current.clear()
//     setRealtimeData({})
//     processingStatsRef.current = {
//       totalUpdates: 0,
//       lastMinuteUpdates: 0,
//       updateTimes: []
//     }
//     setDataProcessingRate(0)
//   }, [])

//   return {
//     realtimeData,
//     dataProcessingRate,
//     lastUpdateTime,
//     isProcessing,
//     heartbeatActive,
//     getChartData,
//     clearParameterData,
//     resetAllData,
//     totalUpdates: processingStatsRef.current.totalUpdates
//   }
// }



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
