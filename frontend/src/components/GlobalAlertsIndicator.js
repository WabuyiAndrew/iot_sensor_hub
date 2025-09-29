"use client"

import { useState } from "react"
import { Bell, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff } from "lucide-react"
import { useGlobalAlerts } from "../contexts/GlobalAlertsContext"

const GlobalAlertsIndicator = ({ className = "", showDetails = false, variant = "badge" }) => {
  const {
    alerts,
    loading,
    error,
    isConnected,
    isInitialized,
    isProcessing,
    lastProcessed,
    getAlertStats
  } = useGlobalAlerts()

  const [isExpanded, setIsExpanded] = useState(false)
  
  const stats = getAlertStats()
  const hasActiveAlerts = stats.active > 0
  const hasCriticalAlerts = stats.critical > 0

  // Badge variant - simple notification badge
  if (variant === "badge") {
    return (
      <div className={`relative ${className}`}>
        <Bell 
          size={20} 
          className={`${hasActiveAlerts ? 'text-red-500' : 'text-gray-400'} transition-colors duration-200`}
        />
        {hasActiveAlerts && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse min-w-[20px]">
            {stats.active > 99 ? "99+" : stats.active}
          </span>
        )}
        {error && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-3 w-3 flex items-center justify-center">
            !
          </span>
        )}
      </div>
    )
  }

  // Card variant - detailed status card
  if (variant === "card") {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell size={20} className={hasActiveAlerts ? 'text-red-500' : 'text-gray-400'} />
            Global Alerts
          </h3>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi size={16} className="text-green-500" />
            ) : (
              <WifiOff size={16} className="text-red-500" />
            )}
            {isProcessing && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        </div>

        {loading && !isInitialized ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Initializing alerts system...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 py-2">
            <AlertTriangle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Alert Statistics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.active}</div>
                <div className="text-xs text-red-600 dark:text-red-400">Active</div>
              </div>
              <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.critical}</div>
                <div className="text-xs text-orange-600 dark:text-orange-400">Critical</div>
              </div>
            </div>

            {/* System Status */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle size={14} className="text-green-500" />
                ) : (
                  <AlertTriangle size={14} className="text-red-500" />
                )}
                <span className="text-gray-600 dark:text-gray-300">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {lastProcessed && (
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Clock size={12} />
                  <span className="text-xs">
                    {new Date(lastProcessed).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* Recent Alerts Preview */}
            {stats.active > 0 && showDetails && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Active Alerts</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {alerts
                    .filter(alert => alert.status === 'active')
                    .slice(0, 3)
                    .map(alert => (
                      <div key={alert.id} className="text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {alert.deviceName}
                        </div>
                        <div className="text-gray-600 dark:text-gray-300">
                          {alert.parameterDisplayName}: {alert.currentValue}
                        </div>
                        <div className={`inline-flex px-1 py-0.5 rounded text-xs font-medium ${
                          alert.alertLevel === 'critical' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                        }`}>
                          {alert.alertLevel}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Status variant - inline status indicator
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Bell size={16} className={hasActiveAlerts ? 'text-red-500' : 'text-gray-400'} />
        {hasActiveAlerts && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </div>
      
      <div className="text-sm">
        <span className="font-medium text-gray-900 dark:text-white">
          {stats.active} Alerts
        </span>
        {stats.critical > 0 && (
          <span className="ml-1 text-red-600 dark:text-red-400">
            ({stats.critical} Critical)
          </span>
        )}
      </div>
      
      {error && (
        <AlertTriangle size={14} className="text-orange-500" title={error} />
      )}
    </div>
  )
}

export default GlobalAlertsIndicator