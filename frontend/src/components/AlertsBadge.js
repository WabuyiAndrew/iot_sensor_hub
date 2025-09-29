"use client"

import { Bell } from "lucide-react"
import { useGlobalAlertsWidget } from "../hooks/useGlobalAlertsWidget"

const AlertsBadge = ({ className = "", size = "default", showCount = true, animated = true, onClick = null }) => {
  const { hasActiveAlerts, hasCriticalAlerts, alertBadgeCount, alertBadgeColor, hasErrors, isSystemActive } =
    useGlobalAlertsWidget()

  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-5 h-5",
    large: "w-6 h-6",
  }

  const badgeSize = {
    small: "h-3 w-3 text-[10px]",
    default: "h-4 w-4 text-xs",
    large: "h-5 w-5 text-xs",
  }

  const getBellColor = () => {
    if (hasErrors) return "text-orange-500"
    if (hasCriticalAlerts) return "text-red-500"
    if (hasActiveAlerts) return "text-yellow-500"
    return "text-gray-400"
  }

  const getBadgeColor = () => {
    if (hasCriticalAlerts) return "bg-red-500"
    if (hasActiveAlerts) return "bg-yellow-500"
    return "bg-gray-400"
  }

  const component = (
    <div className={`relative inline-flex items-center ${className}`}>
      <Bell className={`${sizeClasses[size]} ${getBellColor()} transition-colors duration-200`} />

      {/* Active alerts badge */}
      {hasActiveAlerts && showCount && (
        <span
          className={`
            absolute -top-1 -right-1 ${getBadgeColor()} text-white font-bold rounded-full 
            ${badgeSize[size]} flex items-center justify-center shadow-lg min-w-[16px]
            ${animated ? "animate-pulse" : ""}
          `}
        >
          {alertBadgeCount}
        </span>
      )}

      {/* Error indicator */}
      {hasErrors && !hasActiveAlerts && (
        <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-xs font-bold rounded-full h-2 w-2 flex items-center justify-center"></span>
      )}

      {/* System offline indicator */}
      {!isSystemActive && !hasActiveAlerts && !hasErrors && (
        <span className="absolute -top-0.5 -right-0.5 bg-gray-500 text-white text-xs font-bold rounded-full h-2 w-2 flex items-center justify-center"></span>
      )}
    </div>
  )

  // If onClick is provided, wrap in button
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={`${hasActiveAlerts ? `${alertBadgeCount} active alerts` : "No active alerts"}`}
      >
        {component}
      </button>
    )
  }

  return component
}

export default AlertsBadge
