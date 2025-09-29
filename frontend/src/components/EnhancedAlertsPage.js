"use client"

import { useState, useEffect } from "react"
import { Bell, Settings, AlertTriangle, CheckCircle, Clock, Search, X, Eye, Trash2, RefreshCw } from "lucide-react"
import ThresholdManagement from "./ThresholdManagement"

const EnhancedAlertsPage = ({ userRole, axiosInstance, userInfo }) => {
  const [activeTab, setActiveTab] = useState("alerts")
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: "all",
    severity: "all",
    search: "",
  })
  const [stats, setStats] = useState(null)

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get("/api/alerts", {
        params: {
          status: filters.status !== "all" ? filters.status : undefined,
          severity: filters.severity !== "all" ? filters.severity : undefined,
          search: filters.search || undefined,
        },
      })
      setAlerts(response.data.data || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching alerts:", err)
      setError("Failed to fetch alerts")
    } finally {
      setLoading(false)
    }
  }

  // Fetch alert statistics (admin only)
  const fetchStats = async () => {
    if (userRole !== "admin") return

    try {
      const response = await axiosInstance.get("/api/alerts/stats")
      setStats(response.data.data)
    } catch (err) {
      console.error("Error fetching alert stats:", err)
    }
  }

  useEffect(() => {
    if (activeTab === "alerts") {
      fetchAlerts()
      fetchStats()
    }
  }, [activeTab, filters])

  // Handle alert actions
  const handleAlertAction = async (alertId, action) => {
    try {
      await axiosInstance.put(`/api/alerts/${alertId}`, { status: action })
      await fetchAlerts()
      await fetchStats()
    } catch (err) {
      console.error(`Error ${action} alert:`, err)
      setError(`Failed to ${action} alert`)
    }
  }

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return

    try {
      await axiosInstance.delete(`/api/alerts/${alertId}`)
      await fetchAlerts()
      await fetchStats()
    } catch (err) {
      console.error("Error deleting alert:", err)
      setError("Failed to delete alert")
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200"
      case "high":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200"
      case "medium":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200"
      case "low":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200"
      case "acknowledged":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200"
      case "resolved":
        return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="text-blue-600" size={32} />
            Alert Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Monitor and manage system alerts and configure thresholds
          </p>
        </div>

        <button
          onClick={() => {
            fetchAlerts()
            fetchStats()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "alerts"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell size={16} />
              Active Alerts
              {alerts.filter((a) => a.status === "active").length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {alerts.filter((a) => a.status === "active").length}
                </span>
              )}
            </div>
          </button>

          {userRole === "admin" && (
            <button
              onClick={() => setActiveTab("thresholds")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "thresholds"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings size={16} />
                Threshold Configuration
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "alerts" && (
        <div className="space-y-6">
          {/* Statistics Cards (Admin only) */}
          {userRole === "admin" && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total Alerts</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-red-600">{stats.active}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Active</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Acknowledged</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Resolved</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>

              {/* Severity Filter */}
              <select
                value={filters.severity}
                onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertTriangle size={16} />
                {error}
              </div>
            </div>
          )}

          {/* Alerts List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">Loading alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Alerts Found</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {filters.search || filters.status !== "all" || filters.severity !== "all"
                    ? "No alerts match your current filters."
                    : "No alerts have been generated yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Alert
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {alerts.map((alert) => (
                      <tr key={alert._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{alert.message}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Type: {alert.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {alert.data?.deviceName || "Unknown Device"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {alert.data?.deviceSerialNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}
                          >
                            {alert.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}
                          >
                            {alert.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTimestamp(alert.triggeredAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {alert.status === "active" && (
                              <button
                                onClick={() => handleAlertAction(alert._id, "acknowledged")}
                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                title="Acknowledge"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            {(alert.status === "active" || alert.status === "acknowledged") && (
                              <button
                                onClick={() => handleAlertAction(alert._id, "resolved")}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="Resolve"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            {userRole === "admin" && (
                              <button
                                onClick={() => handleDeleteAlert(alert._id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Threshold Management Tab */}
      {activeTab === "thresholds" && userRole === "admin" && (
        <ThresholdManagement userRole={userRole} axiosInstance={axiosInstance} />
      )}
    </div>
  )
}

export default EnhancedAlertsPage
