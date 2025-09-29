"use client"
import { useState } from "react"
import { useSystemMonitoring } from "../hooks/useSystemMonitoring"
import SystemMonitoringWidget from "../components/SystemMonitoringWidget"
import {
  Activity,
  Server,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  Download,
  Settings,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import { toast } from "react-hot-toast"

const SystemMonitoringPage = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(24)
  const [exportFormat, setExportFormat] = useState("json")
  const [showRawData, setShowRawData] = useState(false)

  const { systemHealth, systemStats, loading, error, lastUpdated, manualRefresh, isHealthy, isDegraded, isUnhealthy } =
    useSystemMonitoring({
      enableAutoRefresh: true,
      refreshInterval: 15000, // 15 seconds for admin page
      enableHealthCheck: true,
      enableStats: true,
    })

  // Export monitoring data
  const exportMonitoringData = () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        systemHealth,
        systemStats,
        timeRange: `${selectedTimeRange}h`,
        exportedBy: "System Administrator",
      }

      let content, filename, mimeType

      if (exportFormat === "json") {
        content = JSON.stringify(data, null, 2)
        filename = `system-monitoring-${new Date().toISOString().split("T")[0]}.json`
        mimeType = "application/json"
      } else if (exportFormat === "csv") {
        // Convert to CSV format
        const csvRows = []
        csvRows.push("Metric,Value,Status,Timestamp")

        if (systemHealth) {
          csvRows.push(`System Status,${systemHealth.status},${systemHealth.status},${systemHealth.timestamp}`)
          if (systemHealth.uptime)
            csvRows.push(`Uptime (seconds),${systemHealth.uptime},normal,${systemHealth.timestamp}`)
          if (systemHealth.memory) {
            csvRows.push(
              `Memory Used (MB),${(systemHealth.memory.heapUsed / 1024 / 1024).toFixed(2)},normal,${systemHealth.timestamp}`,
            )
            csvRows.push(
              `Memory Total (MB),${(systemHealth.memory.heapTotal / 1024 / 1024).toFixed(2)},normal,${systemHealth.timestamp}`,
            )
          }
        }

        if (systemStats && !systemStats.error) {
          csvRows.push(`Total Readings,${systemStats.totalRawReadings || 0},normal,${systemStats.timestamp}`)
          csvRows.push(`Active Devices,${systemStats.uniqueDeviceCount || 0},normal,${systemStats.timestamp}`)
          csvRows.push(`Sensor Types,${systemStats.uniqueSensorTypeCount || 0},normal,${systemStats.timestamp}`)
          csvRows.push(
            `Error Rate,${((systemStats.errorRate || 0) * 100).toFixed(2)}%,${(systemStats.errorRate || 0) > 0.1 ? "warning" : "normal"},${systemStats.timestamp}`,
          )
        }

        content = csvRows.join("\n")
        filename = `system-monitoring-${new Date().toISOString().split("T")[0]}.csv`
        mimeType = "text/csv"
      }

      const blob = new Blob([content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Monitoring data exported as ${exportFormat.toUpperCase()}`)
    } catch (err) {
      console.error("Export error:", err)
      toast.error("Failed to export monitoring data")
    }
  }

  const getStatusTrend = (current, previous) => {
    if (!previous) return <Minus className="w-4 h-4 text-gray-400" />
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900/50 dark:via-slate-900/30 dark:to-indigo-950/50">
      <div className="p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                System Monitoring
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Real-time system health and performance monitoring
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
                className="px-3 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              >
                <option value={1}>Last 1 hour</option>
                <option value={6}>Last 6 hours</option>
                <option value={24}>Last 24 hours</option>
                <option value={168}>Last 7 days</option>
              </select>

              {/* Export Controls */}
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="px-3 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>

              <button
                onClick={exportMonitoringData}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Download size={16} className="mr-2" />
                Export
              </button>

              <button
                onClick={manualRefresh}
                disabled={loading}
                className={`flex items-center px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 shadow-lg hover:shadow-xl ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <RefreshCw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {lastUpdated && (
            <div className="flex items-center mt-4 px-3 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-sm text-gray-600 dark:text-gray-400 w-fit">
              <Clock size={16} className="mr-2" />
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>

        {/* Main Monitoring Widget */}
        <div className="max-w-7xl mx-auto mb-8">
          <SystemMonitoringWidget showDetails={true} refreshInterval={15000} />
        </div>

        {/* Additional Monitoring Sections */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* System Performance Metrics */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
              Performance Metrics
            </h3>

            {systemStats && !systemStats.error ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data Throughput</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {systemStats.totalRawReadings?.toLocaleString() || "0"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">readings/24h</p>
                      </div>
                      {getStatusTrend(systemStats.totalRawReadings, 0)}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Error Rate</p>
                        <p
                          className={`text-2xl font-bold ${(systemStats.errorRate || 0) > 0.1 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                        >
                          {((systemStats.errorRate || 0) * 100).toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">error percentage</p>
                      </div>
                      {getStatusTrend(systemStats.errorRate, 0)}
                    </div>
                  </div>
                </div>

                {(systemStats.avgTemperature || systemStats.avgHumidity) && (
                  <div className="grid grid-cols-2 gap-4">
                    {systemStats.avgTemperature && (
                      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Temperature</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {systemStats.avgTemperature.toFixed(1)}°C
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {systemStats.avgHumidity && (
                      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Humidity</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {systemStats.avgHumidity.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Performance metrics unavailable</p>
                {systemStats?.error && <p className="text-sm text-red-500 mt-2">{systemStats.error}</p>}
              </div>
            )}
          </div>

          {/* System Health Details */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Server className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
              System Health Details
            </h3>

            {systemHealth ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center">
                    {isHealthy && <CheckCircle className="w-5 h-5 text-green-500 mr-3" />}
                    {isDegraded && <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3" />}
                    {isUnhealthy && <XCircle className="w-5 h-5 text-red-500 mr-3" />}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Overall Status</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">System health check</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isHealthy
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : isDegraded
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {systemHealth.status}
                  </span>
                </div>

                {systemHealth.services && (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-700 dark:text-gray-300">Service Status</p>
                    {Object.entries(systemHealth.services).map(([service, data]) => (
                      <div
                        key={service}
                        className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg"
                      >
                        <div className="flex items-center">
                          {service === "database" && <Database className="w-4 h-4 text-gray-500 mr-2" />}
                          {service === "websocket" && <Wifi className="w-4 h-4 text-gray-500 mr-2" />}
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{service}</span>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            data.status === "healthy"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {data.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Health data unavailable</p>
              </div>
            )}
          </div>
        </div>

        {/* Raw Data Section */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Settings className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                Raw Monitoring Data
              </h3>
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {showRawData ? "Hide" : "Show"} Raw Data
              </button>
            </div>

            {showRawData && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">System Health Response</h4>
                  <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
                    {JSON.stringify(systemHealth, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">System Statistics Response</h4>
                  <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
                    {JSON.stringify(systemStats, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemMonitoringPage
