"use client"

import { useCallback, useMemo } from "react"
import { useGlobalAlerts } from "../contexts/GlobalAlertsContext"
import { useAuth } from "../contexts/AuthContext"

/**
 * Integration hook for components that need to work with the global alerts system
 * This provides a simplified interface and backwards compatibility
 */
export const useGlobalAlertsIntegration = () => {
  const {
    alerts, // The raw alerts state (potentially unfiltered from WebSockets)
    devices,
    thresholds,
    deviceStats, 
    loading,
    error,
    isInitialized,
    isProcessing,
    lastProcessed,
    isConnected,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    getAlertStats,
    getParameterDisplayName,
    refreshAlerts,
    processAlerts,
  } = useGlobalAlerts()

  const { user } = useAuth()

  // 1. Filter devices by role (Critical for frontend component display)
  const filteredDevices = useMemo(() => {
    if (user?.role === "admin") return devices
    return devices.filter((d) =>
      user?.devices?.some((ud) => (ud._id || ud.id || ud) === (d._id || d.id)),
    )
  }, [devices, user])

  // 2. Get a Set of accessible device names for fast alert lookup
  const accessibleDeviceNames = useMemo(() => {
    // Use 'name' property, as alerts often carry 'deviceName' string, not the ID
    return new Set(filteredDevices.map(d => d.name).filter(name => name))
  }, [filteredDevices]);

  // 3. 🚨 CRITICAL FIX: Filter the raw alerts array by accessible devices
  const userFilteredAlerts = useMemo(() => {
    if (user?.role === "admin") {
        return alerts;
    }
    
    // Filter alerts where the alert's device name is in the accessible set
    return alerts.filter(alert => accessibleDeviceNames.has(alert.deviceName));
  }, [alerts, user, accessibleDeviceNames]);

  // Use the filtered alerts array for all calculations below:
  
  // Filter active alerts 
  const activeAlerts = useMemo(() => {
    return userFilteredAlerts.filter((alert) => alert.status === "active")
  }, [userFilteredAlerts])

  // Get alert history 
  const alertHistory = useMemo(() => {
    return userFilteredAlerts.filter((alert) => alert.status !== "active")
  }, [userFilteredAlerts])

  // Filter deviceStats by role
  const filteredDeviceStats = useMemo(() => {
    if (user?.role === "admin") return deviceStats
    
    return {
      ...deviceStats,
      devicesMonitored: filteredDevices.length,
      totalDevices: filteredDevices.length,
      activeDevices: filteredDevices.filter((d) => d.status === "active").length,
      inactiveDevices: filteredDevices.filter((d) => d.status === "inactive").length,
      tanksMonitored: deviceStats.tanksMonitored, 
    }
  }, [deviceStats, filteredDevices, user])


  // Backwards compatibility mapping for existing AlertsPage
  const legacyCompatibilityProps = useMemo(
    () => ({
      devices: filteredDevices, // Pass the FILTERED devices list
      thresholds: thresholds,
      activeAlerts: activeAlerts, // Pass the newly calculated activeAlerts
      alertHistory,
      loading,
      error,
      isConnected,
      acknowledgeAlert,
      resolveAlert,
      dismissAlert,
      getAlertStats,
      getParameterDisplayName,
      initialize: refreshAlerts, 
    }),
    [
      filteredDevices, 
      thresholds,
      activeAlerts,
      alertHistory,
      loading,
      error,
      isConnected,
      acknowledgeAlert,
      resolveAlert,
      dismissAlert,
      getAlertStats,
      getParameterDisplayName,
      refreshAlerts,
    ],
  )


  // Enhanced props for new implementations
  const enhancedProps = useMemo(
    () => ({
      ...legacyCompatibilityProps,
      allAlerts: userFilteredAlerts, // Use the filtered list here
      activeAlerts,
      isInitialized,
      isProcessing,
      lastProcessed,
      refreshAlerts,
      processAlerts,
    }),
    [
      legacyCompatibilityProps,
      userFilteredAlerts,
      activeAlerts,
      isInitialized,
      isProcessing,
      lastProcessed,
      refreshAlerts,
      processAlerts,
    ],
  )

  
  // Use filteredDeviceStats in quickStats
  const quickStats = useMemo(() => {
    
    // NOTE: getAlertStats() from GlobalAlertsContext is likely summarizing the RAW 'alerts' array.
    // To ensure correct counts, we must manually run a summary on the userFilteredAlerts here
    // OR ensure that getAlertStats() accepts an optional array to summarize. 
    // Since we don't have GlobalAlertsContext, we'll manually summarize the counts.
    
    const activeCount = userFilteredAlerts.filter(a => a.status === 'active').length;
    const resolvedCount = userFilteredAlerts.filter(a => a.status === 'resolved').length;
    const acknowledgedCount = userFilteredAlerts.filter(a => a.status === 'acknowledged').length;
    
    // Assuming alert severity properties are available on the alert objects:
    const criticalCount = userFilteredAlerts.filter(a => a.severity === 'critical' && a.status === 'active').length;
    const warningCount = userFilteredAlerts.filter(a => (a.severity === 'high' || a.severity === 'medium') && a.status === 'active').length;


    return {
      totalAlerts: userFilteredAlerts.length,
      activeCount: activeCount,
      criticalCount: criticalCount,
      warningCount: warningCount, // Assuming warning covers high/medium active alerts
      acknowledgedCount: acknowledgedCount,
      resolvedCount: resolvedCount,
      hasActiveAlerts: activeCount > 0,
      hasCriticalAlerts: criticalCount > 0,
      devicesMonitored: filteredDeviceStats.devicesMonitored || 0,
      totalDevices: filteredDeviceStats.totalDevices || 0,
      activeDevices: filteredDeviceStats.activeDevices || 0,
      offlineDevices: filteredDeviceStats.inactiveDevices || 0, 
      tanksMonitored: filteredDeviceStats.tanksMonitored || 0,
    }
  }, [userFilteredAlerts, filteredDeviceStats]) // Dependency updated

  // Alert actions with enhanced feedback
  const handleAlertAction = useCallback(
    (alertId, action) => {
      console.log(`🎯 [GlobalAlertsIntegration] Handling alert action: ${action} for ${alertId}`)

      switch (action) {
        case "acknowledge":
        case "acknowledged":
          acknowledgeAlert(alertId)
          break
        case "resolve":
        case "resolved":
          resolveAlert(alertId)
          break
        case "dismiss":
        case "delete":
          dismissAlert(alertId)
          break
        default:
          console.warn(`⚠️ [GlobalAlertsIntegration] Unknown action: ${action}`)
      }
    },
    [acknowledgeAlert, resolveAlert, dismissAlert],
  )

  const getFilteredAlerts = useCallback(
    (filters = {}) => {
      let filtered = userFilteredAlerts // Start with user-filtered alerts

      if (filters.status && filters.status !== "all") {
        filtered = filtered.filter((alert) => alert.status === filters.status)
      }

      if (filters.severity && filters.severity !== "all") {
        // ... (Your existing severity filtering logic remains the same, 
        // but ensure it uses the correct 'severity' or 'alertLevel' property)
        
        // This is the simplified filter from your original code:
        filtered = filtered.filter((alert) => alert.severity === filters.severity)
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(
          (alert) =>
            alert.deviceName?.toLowerCase().includes(searchLower) ||
            alert.parameterDisplayName?.toLowerCase().includes(searchLower) ||
            alert.parameter?.toLowerCase().includes(searchLower) ||
            alert.location?.toLowerCase().includes(searchLower) ||
            alert.description?.toLowerCase().includes(searchLower),
        )
      }

      if (filters.deviceId) {
        filtered = filtered.filter((alert) => alert.deviceId === filters.deviceId)
      }

      return filtered.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
    },
    [userFilteredAlerts],
  )

  // Keep getDeviceAlerts for device-specific filtering
  const getDeviceAlerts = useCallback(
    (deviceId) => {
      return userFilteredAlerts.filter((alert) => alert.deviceId === deviceId)
    },
    [userFilteredAlerts],
  )

  return {
    // Backwards compatibility
    ...legacyCompatibilityProps,

    // Enhanced features
    allAlerts: userFilteredAlerts, // Now guaranteed user-filtered
    activeAlerts,
    isInitialized,
    isProcessing,
    lastProcessed,
    quickStats, 

    // Enhanced functions
    handleAlertAction,
    getFilteredAlerts, 
    getDeviceAlerts,
    refreshAlerts,
    processAlerts,
    
    // Status indicators
    isSystemHealthy: error === null && isConnected && isInitialized,
    needsAttention: quickStats.hasActiveAlerts || error !== null,
    systemStatus: {
      connected: isConnected,
      initialized: isInitialized,
      processing: isProcessing,
      error: error,
      lastUpdate: lastProcessed,
    },
  }
}

// Backwards compatibility hook - maps to the old useRealTimeAlerts interface
export const useRealTimeAlerts = () => {
  return useGlobalAlertsIntegration()
}