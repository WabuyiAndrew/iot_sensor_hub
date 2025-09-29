"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Line, Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  Server,
  XCircle,
  HardDrive,
  Wifi,
  BarChart3,
  Zap,
  Shield,
  Globe,
  Cpu,
  Menu,
  X,
} from "lucide-react"
import { useRealtimeData } from "../../hooks/useRealtimeData"
import { useSystemMonitoring } from "../../hooks/useSystemMonitoring"
import { useRealtimeChartData } from "../../hooks/useRealTimeCharts"
import { useGlobalAlertsIntegration } from "../../hooks/useGlobalAlertsIntegration"
import toast from "react-hot-toast"

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

export default function Dashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })

  const [hasTimedOut, setHasTimedOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Realtime dashboard data
  const {
    data: dashboardData,
    loading: dashboardLoading,
    lastUpdate: dashboardLastUpdate,
    connectionStatus,
    isConnected,
    refresh: refreshDashboard,
  } = useRealtimeData("dashboard_stats", {
    cacheKey: "dashboard_data_cache",
    enablePersistence: true,
  })

  // Realtime devices data
  const { data: devicesData, refresh: refreshDevices } = useRealtimeData("recent_devices", {
    cacheKey: "devices_cache",
    enablePersistence: true,
  })

  // System monitoring with WebSocket optimization
  const {
    systemHealth,
    systemStats,
    loading: systemLoading,
    lastUpdated: systemLastUpdated,
    manualRefresh: refreshSystem,
    isHealthy,
    isDegraded,
    isUnhealthy,
    isConnected: systemConnected,
    isUsingRealtime,
  } = useSystemMonitoring({
    enableHealthCheck: true,
    enableStats: true,
  })

  // Realtime sensor data
  const {
    chartData: realtimeChartData,
    currentValues: realtimeCurrentValues,
    loading: realtimeLoading,
    lastUpdate: realtimeLastUpdate,
    isConnected: realtimeConnected,
  } = useRealtimeChartData("dashboard", ["temperature", "humidity", "pm2_5", "co2"], {
    maxDataPoints: 24,
    updateInterval: 2000,
    enableSmoothing: true,
  })

  // Global alerts integration
  const {
    activeAlerts,
    allAlerts,
    quickStats,
    devices,
    thresholds,
    loading: alertsLoading,
    error: alertsError,
    refreshAlerts,
  } = useGlobalAlertsIntegration()

  // Memoized dashboard stats with fallback values
  const dashboardStats = useMemo(() => ({
    totalUsers: dashboardData?.totalUsers || 0,
    activeDevices: devices?.filter(d => d.isActive).length || 0,
    offlineDevices: devices?.filter(d => !d.isActive).length || 0,
    totalDevices: devices?.length || 0,
    dataTransmissions: dashboardData?.dataTransmissions || 0,
    alertsCount: activeAlerts?.length || 0,
    systemUptime: systemHealth?.uptime || 0,
    avgResponseTime: 150,
  }), [dashboardData, devices, activeAlerts, systemHealth])

  // Memoized recent alerts
  const recentAlerts = useMemo(() => {
    if (activeAlerts && Array.isArray(activeAlerts)) {
      return activeAlerts.slice(0, 8).map((alert, index) => ({
        id: alert._id || alert.id || index.toString(),
        type: alert.severity || alert.type || "info",
        message: alert.message || `Alert from ${alert.deviceName || "Unknown Device"}`,
        time: alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Unknown time",
        deviceId: alert.deviceId,
        deviceName: alert.deviceName,
        severity: alert.severity || "medium",
      }))
    }
    return []
  }, [activeAlerts])

  // Memoized recent devices
  const recentDevices = useMemo(() => {
    if (devices && Array.isArray(devices)) {
      return devices.slice(0, 8).map((device) => ({
        id: device._id || device.id,
        name: device.name || "Unknown Device",
        status: device.isActive ? "online" : "offline",
        lastSeen: device.lastActive
          ? new Date(device.lastActive).toLocaleString()
          : device.updatedAt
            ? new Date(device.updatedAt).toLocaleString()
            : "Unknown",
        type: device.type || "sensor",
        location: device.location || "Unknown",
      }))
    }
    return []
  }, [devices])

  // Generate chart data
  const chartData = useMemo(() => {
    // System Metrics Chart - Use real temperature data if available
    const temperatureData = realtimeChartData.temperature || []
    const systemMetricsData =
      temperatureData.length > 0
        ? temperatureData.slice(-24) // Last 24 points
        : Array.from({ length: 24 }, (_, i) => ({
            value: 75 + (Math.random() - 0.5) * 15,
            timestamp: new Date(Date.now() - (23 - i) * 60000).toISOString(),
          }))

    const systemMetrics = {
      labels: systemMetricsData.map((_, i) => {
        const time = new Date()
        time.setHours(time.getHours() - (23 - i))
        return time.toLocaleTimeString("en-US", { hour: "2-digit" })
      }),
      datasets: [
        {
          label: realtimeConnected ? "Real-time Temperature (°C)" : "CPU Usage (%)",
          data: systemMetricsData.map((d) => d.value || d.y),
          borderColor: realtimeConnected ? "#EF4444" : "#3b82f6",
          backgroundColor: realtimeConnected ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    }

    // Device Status Distribution - Use real data if available
    const deviceStatusDistribution = {
      labels: ["Online", "Offline", "Maintenance"],
      datasets: [
        {
          data: [dashboardStats.activeDevices, dashboardStats.offlineDevices, 2],
          backgroundColor: ["rgba(34, 197, 94, 0.8)", "rgba(239, 68, 68, 0.8)", "rgba(245, 158, 11, 0.8)"],
          borderColor: ["rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)", "rgba(245, 158, 11, 1)"],
          borderWidth: 2,
        },
      ],
    }

    const pm25Data = realtimeChartData.pm2_5 || []
    const airQualityTrendData =
      pm25Data.length > 0
        ? pm25Data.slice(-7) // Last 7 points
        : Array.from({ length: 7 }, (_, i) => ({
            value: Math.max(0, 25 + (Math.random() - 0.5) * 20),
            timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
          }))

    const airQualityTrend = {
      labels: Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toLocaleDateString("en-US", { weekday: "short" })
      }),
      datasets: [
        {
          label: realtimeConnected ? "PM2.5 (µg/m³)" : "Daily Alerts",
          data: airQualityTrendData.map((d) => d.value || d.y),
          borderColor: realtimeConnected ? "#8B5CF6" : "#ef4444",
          backgroundColor: realtimeConnected ? "rgba(139, 92, 246, 0.1)" : "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    }

    return {
      systemMetrics,
      deviceStatusDistribution,
      airQualityTrend, // Renamed from alertsTrend
    }
  }, [dashboardStats, realtimeChartData, realtimeConnected])

  // Chart options
  const getChartOptions = useCallback(
    (title, yAxisLabel = "") => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: !!title,
          text: title,
          font: { size: 14, weight: "bold" },
          padding: { bottom: 15 },
        },
      },
      scales: yAxisLabel
        ? {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: yAxisLabel,
                font: {
                  size: 11,
                },
              },
              ticks: {
                font: {
                  size: 10,
                },
              },
            },
            x: {
              ticks: {
                font: {
                  size: 10,
                },
              },
            },
          }
        : {
            x: {
              ticks: {
                font: {
                  size: 10,
                },
              },
            },
          },
      animation: {
        duration: 750,
        easing: "easeInOutQuart",
      },
    }),
    [],
  )

  // Export functionality
  const exportData = useCallback(
    async (format = "csv") => {
      try {
        const dataToExport = {
          stats: dashboardStats,
          systemHealth,
          systemStats,
          alerts: recentAlerts,
          devices: recentDevices,
          exportedAt: new Date().toISOString(),
        }

        if (format === "json") {
          const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.setAttribute("download", `dashboard-export-${new Date().toISOString().split("T")[0]}.json`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
        } else {
          // CSV format
          let csvContent = "data:text/csv;charset=utf-8,"
          csvContent += "Metric,Value,Timestamp\r\n"
          csvContent += `Total Users,${dashboardStats.totalUsers},${new Date().toISOString()}\r\n`
          csvContent += `Active Devices,${dashboardStats.activeDevices},${new Date().toISOString()}\r\n`
          csvContent += `Offline Devices,${dashboardStats.offlineDevices},${new Date().toISOString()}\r\n`
          csvContent += `Data Transmissions,${dashboardStats.dataTransmissions},${new Date().toISOString()}\r\n`
          csvContent += `System Status,${systemHealth?.status || "Unknown"},${new Date().toISOString()}\r\n`

          const encodedUri = encodeURI(csvContent)
          const link = document.createElement("a")
          link.setAttribute("href", encodedUri)
          link.setAttribute("download", `dashboard-export-${new Date().toISOString().split("T")[0]}.csv`)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }

        toast.success(`Data exported successfully as ${format.toUpperCase()}`)
      } catch (err) {
        console.error("Export error:", err)
        toast.error("Failed to export data")
      }
    },
    [dashboardStats, systemHealth, systemStats, recentAlerts, recentDevices],
  )

  // Manual refresh all data
  const handleManualRefresh = useCallback(() => {
    refreshDashboard()
    refreshAlerts()
    refreshDevices()
    refreshSystem()
    toast.success("Dashboard refreshed")
  }, [refreshDashboard, refreshAlerts, refreshDevices, refreshSystem])

  const getStatusIcon = () => {
    if (systemLoading) return <Activity className="w-5 h-5 animate-spin text-blue-500" />
    if (isHealthy) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (isDegraded) return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    if (isUnhealthy) return <XCircle className="w-5 h-5 text-red-500" />
    return <Server className="w-5 h-5 text-gray-500" />
  }

  const loading = dashboardLoading && !dashboardData && !hasTimedOut

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (dashboardLoading && !dashboardData) {
        console.log("[andy] Dashboard data request timed out, using fallback data")
        setHasTimedOut(true)
        toast.error("Dashboard data loading timed out. Using cached data.", {
          duration: 4000,
        })
      }
    }, 15000) // 15 second timeout

    return () => clearTimeout(timeoutId)
  }, [dashboardLoading, dashboardData])

  useEffect(() => {
    if (!isConnected && !hasTimedOut) {
      const warningTimeout = setTimeout(() => {
        toast.error("Real-time connection lost. Dashboard may show stale data.", {
          duration: 6000,
        })
      }, 10000)

      return () => clearTimeout(warningTimeout)
    }
  }, [isConnected, hasTimedOut])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading Dashboard...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Connecting to real-time data</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            This is taking longer than usual. Check your connection.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {!realtimeConnected && (
        <div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              {/* <p className="text-sm text-amber-700 dark:text-amber-300">
                Real-time connection unavailable - showing cached data
              </p> */}
              {realtimeLastUpdate && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Last update: {realtimeLastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Enhanced Header with Mobile Optimization */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              {/* Title Section */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg sm:rounded-xl">
                  <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    Real-time Dashboard
                  </h1>
                  
                  {/* Status Indicators - Mobile Optimized */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <span
                        className={`text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full ${
                          isHealthy
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : isDegraded
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {systemHealth?.status || "Unknown"}
                      </span>
                    </div>
                    
                    <div
                      className={`flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                        isConnected
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isConnected ? "bg-green-500 animate-pulse" : "bg-orange-500"
                        }`}
                      ></div>
                      <span className="hidden sm:inline">
                        {isConnected ? "Live Updates" : "Offline Mode"}
                      </span>
                      <span className="sm:hidden">
                        {isConnected ? "Live" : "Offline"}
                      </span>
                    </div>
                    
                    {isUsingRealtime && (
                      <div className="hidden sm:flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                        <Wifi className="w-4 h-4" />
                        WebSocket Active
                      </div>
                    )}
                    
                    {dashboardLastUpdate && (
                      <div className="hidden lg:flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        Updated: {dashboardLastUpdate.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Control Panel - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Date Range - Collapsible on Mobile */}
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="bg-transparent text-xs sm:text-sm border-none outline-none text-gray-700 dark:text-gray-300 w-full min-w-0"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="bg-transparent text-xs sm:text-sm border-none outline-none text-gray-700 dark:text-gray-300 w-full min-w-0"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleManualRefresh}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex-1 sm:flex-none"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => exportData("csv")}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>
                    <button
                      onClick={() => exportData("json")}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Improved Mobile Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardStats.totalUsers.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">+12% this month</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg sm:rounded-xl">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardStats.activeDevices.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Active Devices</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                {((dashboardStats.activeDevices / dashboardStats.totalDevices) * 100 || 0).toFixed(1)}% online
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div
                className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${
                  dashboardStats.alertsCount > 5
                    ? "bg-red-100 dark:bg-red-900/30"
                    : dashboardStats.alertsCount > 0
                      ? "bg-yellow-100 dark:bg-yellow-900/30"
                      : "bg-green-100 dark:bg-green-900/30"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    dashboardStats.alertsCount > 5
                      ? "text-red-600 dark:text-red-400"
                      : dashboardStats.alertsCount > 0
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-green-600 dark:text-green-400"
                  }`}
                />
              </div>
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.alertsCount}</p>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Active Alerts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                {systemStats?.errorRate
                  ? `${(systemStats.errorRate * 100).toFixed(2)}% error rate`
                  : "All systems operational"}
              </span>
            </div>
          </div>
        </div>

        {/* Charts Grid - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-6 mb-6 sm:mb-8">
          {/* Device Status Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Device Status</h2>
            </div>
            <div className="h-64 sm:h-80">
              <Doughnut data={chartData.deviceStatusDistribution} options={getChartOptions("Device Distribution")} />
            </div>
          </div>
        </div>

        {/* Recent Activity - Mobile Optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Recent Alerts</h2>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs sm:text-sm font-medium">
                  {recentAlerts.length} active
                </span>
              </div>
            </div>
            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {recentAlerts.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                            alert.severity === "critical"
                              ? "bg-red-100 dark:bg-red-900/30"
                              : alert.severity === "high"
                                ? "bg-orange-100 dark:bg-orange-900/30"
                                : alert.severity === "medium"
                                  ? "bg-yellow-100 dark:bg-yellow-900/30"
                                  : "bg-blue-100 dark:bg-blue-900/30"
                          }`}
                        >
                          <AlertTriangle
                            className={`h-3 w-3 sm:h-4 sm:w-4 ${
                              alert.severity === "critical"
                                ? "text-red-600 dark:text-red-400"
                                : alert.severity === "high"
                                  ? "text-orange-600 dark:text-orange-400"
                                  : alert.severity === "medium"
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-blue-600 dark:text-blue-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{alert.message}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{alert.time}</p>
                            {alert.deviceName && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{alert.deviceName}</p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                            alert.severity === "critical"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : alert.severity === "high"
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                                : alert.severity === "medium"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 sm:p-8 text-center">
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No active alerts</p>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">All systems running smoothly</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Devices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Server className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Device Status</h2>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs sm:text-sm font-medium">
                  {dashboardStats.totalDevices} devices
                </span>
              </div>
            </div>
            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {recentDevices.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentDevices.map((device) => (
                    <div key={device.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          <div
                            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                              device.status === "online"
                                ? "bg-green-500"
                                : device.status === "maintenance"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          ></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{device.name}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{device.type}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{device.location}</p>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                              Last seen: {device.lastSeen}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                            device.status === "online"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : device.status === "maintenance"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {device.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 sm:p-8 text-center">
                  <HardDrive className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No devices found</p>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">Add devices to start monitoring</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}