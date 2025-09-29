"use client"

import { useCallback } from "react"
import { useRealtimeData } from "./useRealtimeData"

export const useSystemMonitoring = (options = {}) => {
  const {
    enableHealthCheck = true,
    enableStats = true,
    refreshInterval = 30000, // 30 seconds
    requestThrottle = 15000, // 15 seconds
    maxRetries = 2,
  } = options

  const {
    data: systemHealth,
    loading: healthLoading,
    error: healthError,
    lastUpdate: healthLastUpdate,
    isConnected: healthConnected,
    refresh: refreshHealth,
  } = useRealtimeData("system_health", {
    cacheKey: "system_health_cache",
    enablePersistence: true,
    requestThrottle,
    maxRetries,
    fallbackData: {
      status: "unknown",
      uptime: 0,
      services: [],
    },
  })

  const {
    data: systemStats,
    loading: statsLoading,
    error: statsError,
    lastUpdate: statsLastUpdate,
    refresh: refreshStats,
  } = useRealtimeData("system_stats", {
    cacheKey: "system_stats_cache",
    enablePersistence: enableStats,
    requestThrottle,
    maxRetries,
    fallbackData: {
      totalRawReadings: 0,
      errorRate: 0,
      avgResponseTime: 0,
    },
  })

  const isHealthy = systemHealth?.status === "healthy" || systemHealth?.status === "operational"
  const isDegraded = systemHealth?.status === "degraded" || systemHealth?.status === "warning"
  const isUnhealthy =
    systemHealth?.status === "unhealthy" || systemHealth?.status === "critical" || systemHealth?.status === "error"

  const loading = (enableHealthCheck && healthLoading) || (enableStats && statsLoading)
  const error = healthError || statsError
  const isConnected = healthConnected
  const lastUpdated = healthLastUpdate || statsLastUpdate
  const isUsingRealtime = isConnected && !error

  const manualRefresh = useCallback(() => {
    console.log("andy 🔄 Manual system monitoring refresh")
    if (enableHealthCheck) refreshHealth()
    if (enableStats) refreshStats()
  }, [enableHealthCheck, enableStats, refreshHealth, refreshStats])

  return {
    systemHealth,
    systemStats,
    loading,
    error,
    lastUpdated,
    isHealthy,
    isDegraded,
    isUnhealthy,
    isConnected,
    isUsingRealtime,
    manualRefresh,
  }
}
