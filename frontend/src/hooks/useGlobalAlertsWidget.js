"use client"

import { useMemo } from "react"
import { useGlobalAlerts } from "../contexts/GlobalAlertsContext"

/**
 * Specialized hook for dashboard widgets and navigation components
 * that need quick access to alert status information
 */
export const useGlobalAlertsWidget = () => {
  const {
    alerts, // Now user-filtered from context
    loading,
    error,
    isConnected,
    isInitialized,
    getAlertStats,
  } = useGlobalAlerts()

  // Compute widget-specific data - alerts are already user-filtered
  const widgetData = useMemo(() => {
    const stats = getAlertStats()

    return {
      // Basic counts
      totalAlerts: stats.total,
      activeAlerts: stats.active,
      criticalAlerts: stats.critical,
      warningAlerts: stats.warning,
      acknowledgedAlerts: stats.acknowledged,
      resolvedAlerts: stats.resolved,

      // Status booleans
      hasActiveAlerts: stats.active > 0,
      hasCriticalAlerts: stats.critical > 0,
      hasAnyAlerts: stats.total > 0,

      // Display helpers
      alertBadgeCount: stats.active > 99 ? "99+" : stats.active.toString(),
      alertBadgeColor: stats.critical > 0 ? "red" : stats.active > 0 ? "yellow" : "gray",

      // Status indicators
      isHealthy: stats.active === 0 && error === null,
      needsAttention: stats.critical > 0,
      hasWarnings: stats.warning > 0 && stats.critical === 0,

      // Connection status
      isSystemActive: isConnected && isInitialized && !loading,
      hasErrors: !!error,

      // Recent alerts (last 5 active alerts for quick display) - already user-filtered
      recentAlerts: alerts
        .filter((alert) => alert.status === "active")
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        .slice(0, 5)
        .map((alert) => ({
          id: alert.id,
          deviceName: alert.deviceName,
          parameter: alert.parameterDisplayName,
          value: alert.currentValue,
          severity: alert.alertLevel,
          time: alert.lastUpdated,
        })),
    }
  }, [alerts, getAlertStats, error, isConnected, isInitialized, loading])

  // System status summary
  const systemStatus = useMemo(() => {
    if (error) return { status: "error", message: error, color: "red" }
    if (!isConnected) return { status: "disconnected", message: "System offline", color: "gray" }
    if (!isInitialized) return { status: "initializing", message: "Starting up...", color: "yellow" }
    if (widgetData.hasCriticalAlerts)
      return { status: "critical", message: `${widgetData.criticalAlerts} critical alerts`, color: "red" }
    if (widgetData.hasActiveAlerts)
      return { status: "warning", message: `${widgetData.activeAlerts} active alerts`, color: "yellow" }
    return { status: "healthy", message: "All systems normal", color: "green" }
  }, [error, isConnected, isInitialized, widgetData])

  return {
    ...widgetData,
    systemStatus,
    loading,
    error,
    isConnected,
    isInitialized,
  }
}
