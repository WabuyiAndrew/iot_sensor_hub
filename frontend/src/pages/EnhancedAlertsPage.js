import { useState, useMemo, useEffect } from "react"
import {
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle,
  Search,
  RefreshCcw,
  Eye,
  Filter,
  SortDesc,
  SortAsc,
  Calendar,
  Clock,
  TrendingUp,
  Shield,
  Activity,
} from "lucide-react"
import { toast } from "react-hot-toast"
import clsx from "clsx"
import { useOutletContext } from "react-router-dom"

// Parameter descriptions for user comprehension
const PARAM_LABELS = {
  temperature: { label: "Temperature", unit: "°C", action: "Check cooling/ventilation", icon: "🌡️" },
  humidity: { label: "Humidity", unit: "%RH", action: "Monitor for condensation", icon: "💧" },
  pm2_5: { label: "PM2.5", unit: "μg/m³", action: "Improve air filtration", icon: "🌫️" },
  pm10: { label: "PM10", unit: "μg/m³", action: "Improve air filtration", icon: "🌫️" },
  noise: { label: "Noise Level", unit: "dB", action: "Investigate noise sources", icon: "🔊" },
  liquid_level: { label: "Liquid Level", unit: "units", action: "Refill tank", icon: "🪣" },
  ultrasonic_liquid_level: { label: "Ultrasonic Level", unit: "m", action: "Refill tank", icon: "📏" },
}

// Severity mapping with enhanced styling
const SEVERITY = {
  critical: {
    icon: "AlertCircle",
    border: "border-l-4 border-red-500",
    bg: "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30",
    text: "text-red-800 dark:text-red-200",
    label: "Critical",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    glowClass: "shadow-red-200 dark:shadow-red-900/50",
  },
  warning: {
    icon: "AlertTriangle",
    border: "border-l-4 border-yellow-400",
    bg: "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/30",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "Warning",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    glowClass: "shadow-yellow-200 dark:shadow-yellow-900/50",
  },
  info: {
    icon: "Info",
    border: "border-l-4 border-blue-500",
    bg: "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30",
    text: "text-blue-800 dark:text-blue-200",
    label: "Info",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    glowClass: "shadow-blue-200 dark:shadow-blue-900/50",
  },
  success: {
    icon: "CheckCircle",
    border: "border-l-4 border-green-500",
    bg: "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30",
    text: "text-green-800 dark:text-green-200",
    label: "Success",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    glowClass: "shadow-green-200 dark:shadow-green-900/50",
  },
}

function getAlertComment(param, value, severity) {
  if (param === "liquid_level" && severity === "critical") {
    return "Tank is nearly empty. Schedule a refill right away."
  }
  if (param === "temperature" && severity === "critical") {
    return value > 50
      ? "Extremely high temperature! Shut down if possible."
      : "Temperature is above safe threshold. Take immediate action."
  }
  if (param === "humidity" && severity === "warning") {
    return "High humidity may cause condensation or mold. Check dehumidifiers."
  }
  if (param === "noise" && severity === "warning") {
    return "High noise may indicate a malfunctioning device. Inspect soon."
  }
  if ((param === "pm2_5" || param === "pm10") && severity === "warning") {
    return "Air quality is poor. Wear a mask or increase ventilation."
  }
  return "Monitor and address as soon as possible."
}

function generateAlertsFromAllDevices(allDevicesSensorData, userInfo) {
  const alerts = []
  if (!allDevicesSensorData || typeof allDevicesSensorData !== "object") return alerts

  // Get user's assigned device IDs if user role
  const userDeviceIds =
    userInfo?.role === "user" ? (userInfo.devices || []).map((device) => device._id || device.id).filter(Boolean) : null

  Object.entries(allDevicesSensorData).forEach(([deviceId, deviceData]) => {
    if (!deviceData || typeof deviceData !== "object" || !deviceData.values) return

    // Filter devices based on user role
    if (userInfo?.role === "user" && userDeviceIds && !userDeviceIds.includes(deviceId)) {
      return // Skip this device if user doesn't have access
    }

    const { values: sensorValues, timestamp: createdAt } = deviceData

    Object.entries(sensorValues).forEach(([paramName, paramValue]) => {
      if (typeof paramValue !== "number" || isNaN(paramValue)) return

      if (paramName === "temperature" && paramValue > 20)
        alerts.push({
          id: `temp-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "critical",
          createdAt,
        })

      if (paramName === "humidity" && paramValue > 60)
        alerts.push({
          id: `hum-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "warning",
          createdAt,
        })

      if (paramName === "liquid_level" && paramValue < 10)
        alerts.push({
          id: `liquid-low-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "critical",
          createdAt,
        })

      if (paramName === "noise" && paramValue > 80)
        alerts.push({
          id: `noise-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "warning",
          createdAt,
        })

      if (paramName === "pm2_5" && paramValue > 35)
        alerts.push({
          id: `pm25-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "warning",
          createdAt,
        })

      if (paramName === "pm10" && paramValue > 80)
        alerts.push({
          id: `pm10-high-${deviceId}-${createdAt}`,
          deviceId,
          paramName,
          paramValue,
          severity: "warning",
          createdAt,
        })
    })
  })

  return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export default function EnhancedAlertsPage() {
  const [search, setSearch] = useState("")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [sortDesc, setSortDesc] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState("table") // table or cards
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const { userRole, globalAlerts, allDevicesSensorData, userInfo } = useOutletContext()

  // Use alerts from context, fallback to generating them if not available
  const alerts = useMemo(() => {
    if (globalAlerts && globalAlerts.length >= 0) {
      return globalAlerts
    }
    // Fallback: generate alerts if not provided in context
    return generateAlertsFromAllDevices(allDevicesSensorData || {}, userInfo)
  }, [globalAlerts, allDevicesSensorData, userInfo])

  // Automatic refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date())
      // Silent refresh - you can add your refresh logic here
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      setLastRefresh(new Date())
      toast.success("Alerts refreshed!", {
        icon: "🔄",
        style: {
          borderRadius: "16px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        },
      })
    }, 1000)
  }

  const filteredAlerts = useMemo(() => {
    let filtered = alerts

    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          (a.deviceId || "").toLowerCase().includes(s) ||
          (PARAM_LABELS[a.paramName]?.label || a.paramName || "").toLowerCase().includes(s) ||
          (a.severity || "").toLowerCase().includes(s),
      )
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((a) => a.severity === severityFilter)
    }

    filtered = filtered.sort((a, b) =>
      sortDesc
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    return filtered
  }, [alerts, search, severityFilter, sortDesc])

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length
  const warningCount = alerts.filter((a) => a.severity === "warning").length
  const totalDevices = new Set(alerts.map((a) => a.deviceId)).size

  // Enhanced Alert Card Component for better large screen display
  const AlertCard = ({ alert }) => {
    const sev = SEVERITY[alert.severity] || SEVERITY.info
    const paramMeta = PARAM_LABELS[alert.paramName] || {
      label: alert.paramName,
      unit: "",
      action: "",
      icon: "📊",
    }

    return (
      <div
        className={clsx(
          "rounded-2xl p-6 mb-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
          sev.bg,
          sev.border,
          sev.glowClass,
          "shadow-lg",
          // Enhanced for large screens
          "lg:p-8 xl:p-10 max-w-md mx-auto lg:max-w-none"
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="text-3xl lg:text-4xl">{paramMeta.icon}</div>
            <div>
              <h3 className={clsx("font-bold text-xl lg:text-2xl", sev.text)}>{paramMeta.label} Alert</h3>
              <p className="text-base lg:text-lg text-gray-600 dark:text-gray-400">Device {alert.deviceId}</p>
            </div>
          </div>
          <span
            className={clsx("inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold", sev.badgeClass)}
          >
            {getSeverityIcon(alert.severity)}
            {sev.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Value</p>
            <p className="font-bold text-2xl lg:text-3xl">
              {alert.paramValue}
              <span className="text-lg text-gray-500 ml-2">{paramMeta.unit}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Time</p>
            <p className="font-medium text-lg">{new Date(alert.createdAt).toLocaleTimeString()}</p>
            <p className="text-sm text-gray-500">{new Date(alert.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-medium">Recommended Action</p>
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{paramMeta.action || "Monitor"}</p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-medium">Comment</p>
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
            {getAlertComment(alert.paramName, alert.paramValue, alert.severity)}
          </p>
        </div>

        <button
          onClick={() =>
            toast(
              <div className="text-sm text-left space-y-3 max-w-sm">
                <div className="font-bold flex items-center gap-2 text-lg">
                  {getSeverityIcon(alert.severity)}
                  {sev.label} Alert Details
                </div>
                <div className="space-y-2 text-gray-700">
                  <div>
                    <strong>Device:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{alert.deviceId}</code>
                  </div>
                  <div>
                    <strong>Parameter:</strong> {paramMeta.label}
                  </div>
                  <div>
                    <strong>Value:</strong> {alert.paramValue} {paramMeta.unit}
                  </div>
                  <div>
                    <strong>Time:</strong> {new Date(alert.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <strong>Action:</strong> {paramMeta.action || "Monitor"}
                  </div>
                  <div>
                    <strong>Comment:</strong> {getAlertComment(alert.paramName, alert.paramValue, alert.severity)}
                  </div>
                </div>
              </div>,
              {
                duration: 8000,
                style: {
                  borderRadius: "16px",
                  background: "#fff",
                  color: "#333",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  border: "1px solid #e5e7eb",
                },
              },
            )
          }
          className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-white/50 dark:bg-gray-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 text-base font-medium"
        >
          <Eye className="w-5 h-5" />
          View Full Details
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Enhanced Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">System Alerts</h1>
                    <p className="text-blue-100 dark:text-gray-300 text-lg">
                      {userRole === "admin"
                        ? `Monitoring ${totalDevices} devices across the entire system`
                        : `Viewing alerts for your ${totalDevices} assigned devices`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Stats Cards with Centered Content */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-8 h-8 text-red-300 mb-2" />
                    <p className="text-sm font-medium text-red-200 mb-1">Critical</p>
                    <p className="text-3xl font-bold text-white">{criticalCount}</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-300 mb-2" />
                    <p className="text-sm font-medium text-yellow-200 mb-1">Warning</p>
                    <p className="text-3xl font-bold text-white">{warningCount}</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 col-span-2 sm:col-span-1">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Activity className="w-8 h-8 text-green-300 mb-2" />
                    <p className="text-sm font-medium text-green-200 mb-1">Total</p>
                    <p className="text-3xl font-bold text-white">{alerts.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls Section */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col space-y-4">
            {/* Search and View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  type="text"
                  placeholder="Search devices, parameters, or severity..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* View Mode Toggle for Mobile */}
              <div className="sm:hidden flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
                <button
                  onClick={() => setViewMode("cards")}
                  className={clsx(
                    "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                    viewMode === "cards"
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md"
                      : "text-gray-600 dark:text-gray-400",
                  )}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={clsx(
                    "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                    viewMode === "table"
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md"
                      : "text-gray-600 dark:text-gray-400",
                  )}
                >
                  Table
                </button>
              </div>
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  className="pl-10 pr-8 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer min-w-[140px]"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <button
                onClick={() => setSortDesc(!sortDesc)}
                className="flex items-center gap-2 px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 text-gray-700 dark:text-gray-200"
              >
                {sortDesc ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                <span className="hidden sm:inline">{sortDesc ? "Newest First" : "Oldest First"}</span>
                <span className="sm:hidden">{sortDesc ? "Newest" : "Oldest"}</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 font-medium"
              >
                <RefreshCcw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Alerts Content */}
        {filteredAlerts.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-xl p-12">
            <div className="text-center">
              <div className="relative mb-6">
                <CheckCircle className="mx-auto text-green-500 w-20 h-20 animate-pulse" />
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All Clear! 🎉</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No alerts found matching your criteria</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                All monitored systems are operating within normal parameters
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className={clsx("sm:hidden", viewMode === "table" && "hidden")}>
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>

            {/* Large Screen Cards View */}
            <div className={clsx("hidden lg:block", viewMode === "table" && "lg:hidden")}>
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                {filteredAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className={clsx("hidden sm:block lg:hidden", viewMode === "cards" && "sm:hidden")}>
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80 border-b border-gray-200/50 dark:border-gray-600/50">
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Date/Time
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                          Device
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                          Parameter
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                          Value
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                          Severity
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                          Action
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                      {filteredAlerts.map((alert, i) => {
                        const sev = SEVERITY[alert.severity] || SEVERITY.info
                        const paramMeta = PARAM_LABELS[alert.paramName] || {
                          label: alert.paramName,
                          unit: "",
                          action: "",
                          icon: "📊",
                        }

                        return (
                          <tr
                            key={alert.id}
                            className={clsx(
                              "transition-all duration-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/50",
                              sev.bg,
                              sev.border,
                              "hover:shadow-lg hover:scale-[1.01] transform",
                            )}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {new Date(alert.createdAt).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(alert.createdAt).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {alert.deviceId}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{paramMeta.icon}</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {paramMeta.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {alert.paramValue}
                                <span className="text-sm text-gray-500 ml-1 font-normal">{paramMeta.unit}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={clsx(
                                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
                                  sev.badgeClass,
                                )}
                              >
                                {getSeverityIcon(alert.severity)}
                                {sev.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                                {paramMeta.action || "Monitor"}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-300 transition-all duration-200 hover:scale-110"
                                title="View details"
                                onClick={() =>
                                  toast(
                                    <div className="text-sm text-left space-y-3">
                                      <div className="font-bold flex items-center gap-2 text-lg">
                                        {getSeverityIcon(alert.severity)}
                                        {sev.label} Alert Details
                                      </div>
                                      <div className="space-y-2 text-gray-700">
                                        <div className="flex justify-between">
                                          <strong>Device:</strong>
                                          <code className="bg-gray-100 px-2 py-1 rounded">{alert.deviceId}</code>
                                        </div>
                                        <div className="flex justify-between">
                                          <strong>Parameter:</strong>
                                          <span>{paramMeta.label}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <strong>Value:</strong>
                                          <span>
                                            {alert.paramValue} {paramMeta.unit}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <strong>Time:</strong>
                                          <span>{new Date(alert.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="pt-2 border-t">
                                          <strong>Recommended Action:</strong>
                                          <p className="mt-1">{paramMeta.action || "Monitor"}</p>
                                        </div>
                                        <div>
                                          <strong>Comment:</strong>
                                          <p className="mt-1">
                                            {getAlertComment(alert.paramName, alert.paramValue, alert.severity)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>,
                                    {
                                      duration: 10000,
                                      style: {
                                        borderRadius: "20px",
                                        background: "#fff",
                                        color: "#333",
                                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                                        border: "1px solid #e5e7eb",
                                        maxWidth: "500px",
                                      },
                                    },
                                  )
                                }
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Enhanced Summary Footer */}
        {filteredAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  Showing {filteredAlerts.length} of {alerts.length} alerts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-600 dark:text-blue-400">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}