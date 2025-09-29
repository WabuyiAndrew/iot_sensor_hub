import { useState, useEffect, useMemo } from "react"
import { Bell, Settings, AlertTriangle, CheckCircle, Clock, Search, X, Eye, Trash2, RefreshCw, CreditCard as Edit, Save, XCircle } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useGlobalAlertsIntegration } from "../hooks/useGlobalAlertsIntegration"

// The fixed list of configurable parameters
const configurableParameters = [
  "temperature", "humidity", "pm25", "pm10", "co2", "atmosphericPressure",
  "windSpeed", "windDir", "rainfall", "totalSolarRadiation", "noise",
  "ultrasonic_liquid_level", "pressure_level", "liquid_level_raw",
  "signalStrength",
]

const AlertsPage = () => {
  const { user, axiosInstance } = useAuth()
  
  // Use the new global alerts integration hook
  const {
    devices,
    thresholds,
    allAlerts,
    activeAlerts,
    loading: alertsLoading,
    error: alertsError,
    isConnected,
    isInitialized,
    isProcessing,
    lastProcessed,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    getAlertStats,
    getParameterDisplayName,
    getFilteredAlerts,
    handleAlertAction,
    refreshAlerts,
    quickStats,
    systemStatus
  } = useGlobalAlertsIntegration()
  
  const userRole = user?.role

  const [activeTab, setActiveTab] = useState("alerts")
  const [localThresholds, setLocalThresholds] = useState([])
  const [thresholdLoading, setThresholdLoading] = useState(false)
  // Removed thresholdError state as we'll use console warnings instead
  const [filters, setFilters] = useState({
    status: "all",
    severity: "all",
    search: "",
  })
  
  // State for editing thresholds
  const [editingThreshold, setEditingThreshold] = useState(null)
  const [editedValues, setEditedValues] = useState({
    warningThreshold: "",
    criticalThreshold: "",
    description: "",
    isActive: true
  })

  // State for save operation errors (different from fetch errors)
  const [saveError, setSaveError] = useState(null)

  // Filter alerts using the new filtering system
  const filteredAlerts = useMemo(() => {
    return getFilteredAlerts(filters)
  }, [getFilteredAlerts, filters])
  
  // Get alert statistics
  const stats = useMemo(() => {
    return getAlertStats()
  }, [getAlertStats])

  // Enhanced threshold fetching with console warnings instead of UI errors
  const fetchThresholds = async () => {
    if (userRole !== "admin") return

    try {
      setThresholdLoading(true)
      console.log('=== FETCHING THRESHOLDS (AlertsPage) ===')
      const response = await axiosInstance.get("/api/thresholds")
      const fetchedThresholds = response.data.data || []

      // Map the fixed parameters to their fetched values
      const updatedThresholds = configurableParameters.map(param => {
        const fetched = fetchedThresholds.find(t => t.parameter === param)
        
        return {
          _id: fetched?._id || null,
          parameter: param,
          warningThreshold: fetched?.warningThreshold || null,
          criticalThreshold: fetched?.criticalThreshold || null,
          description: fetched?.description || "",
          isActive: fetched?.isActive !== undefined ? fetched.isActive : true
        }
      })

      setLocalThresholds(updatedThresholds)
      console.log('✅ Thresholds loaded successfully:', updatedThresholds.length, 'parameters configured')
    } catch (err) {
      // Use console warning instead of UI error for fetch failures
      console.warn("⚠️  Failed to fetch threshold configuration:", {
        error: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        timestamp: new Date().toISOString()
      })
      
      // Initialize with default empty thresholds so UI doesn't break
      const defaultThresholds = configurableParameters.map(param => ({
        _id: null,
        parameter: param,
        warningThreshold: null,
        criticalThreshold: null,
        description: "",
        isActive: true
      }))
      setLocalThresholds(defaultThresholds)
      
      console.warn("📋 Initialized with default threshold configuration (no values set)")
    } finally {
      setThresholdLoading(false)
    }
  }

  useEffect(() => {
    if (userRole === undefined) return

    if (activeTab === "thresholds" && userRole === "admin") {
      fetchThresholds()
    }
  }, [activeTab, userRole])

  // Handle alert actions using the new system
  const handleAlertActionLocal = (alertId, action) => {
    handleAlertAction(alertId, action)
  }

  const handleDeleteAlert = (alertId) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return
    handleAlertAction(alertId, 'dismiss')
  }

  // Threshold management functions
  const handleEditThreshold = (threshold) => {
    setEditingThreshold(threshold)
    setEditedValues({
      warningThreshold: threshold.warningThreshold?.toString() || "",
      criticalThreshold: threshold.criticalThreshold?.toString() || "",
      description: threshold.description || "",
      isActive: threshold.isActive !== undefined ? threshold.isActive : true
    })
    // Clear any previous save errors when starting to edit
    setSaveError(null)
  }

  const handleCancelEdit = () => {
    setEditingThreshold(null)
    setEditedValues({
      warningThreshold: "",
      criticalThreshold: "",
      description: "",
      isActive: true
    })
    setSaveError(null)
  }

  const handleSaveThreshold = async () => {
    if (!editingThreshold) return

    try {
      setSaveError(null)
      
      const warningValue = editedValues.warningThreshold ? parseFloat(editedValues.warningThreshold) : null
      const criticalValue = editedValues.criticalThreshold ? parseFloat(editedValues.criticalThreshold) : null

      if (editedValues.warningThreshold && isNaN(warningValue)) {
        setSaveError("Warning threshold must be a valid number")
        return
      }

      if (editedValues.criticalThreshold && isNaN(criticalValue)) {
        setSaveError("Critical threshold must be a valid number")
        return
      }

      if (warningValue === null && criticalValue === null) {
        setSaveError("At least one threshold value must be provided")
        return
      }
      
      const payload = {
        parameter: editingThreshold.parameter,
        warningThreshold: warningValue,
        criticalThreshold: criticalValue,
        description: editedValues.description.trim(),
        isActive: editedValues.isActive
      }
      
      let response
      if (editingThreshold._id) {
        response = await axiosInstance.put(`/api/thresholds/${editingThreshold._id}`, payload)
      } else {
        response = await axiosInstance.post(`/api/thresholds`, payload)
      }
      
      console.log('✅ Threshold saved successfully:', payload.parameter)
      
      // Reset state and refresh
      setEditingThreshold(null)
      setEditedValues({
        warningThreshold: "",
        criticalThreshold: "",
        description: "",
        isActive: true
      })
      
      // Refresh both local thresholds and global alerts
      await Promise.all([
        fetchThresholds(),
        refreshAlerts()
      ])
      
    } catch (err) {
      console.error("❌ Error saving threshold:", err)
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          "Failed to save threshold"
      setSaveError(errorMessage)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200"
      case "high": return "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200"
      case "medium": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200"
      case "low": return "text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200"
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200"
      case "acknowledged": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200"
      case "resolved": return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200"
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="text-blue-600" size={32} />
            Global Alert Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Automated monitoring and alert management across all devices
          </p>
        </div>
        <button
          onClick={refreshAlerts}
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
          {isProcessing ? 'Processing...' : 'Refresh'}
        </button>
      </div>
      
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
              {/* Conditional Label based on role */}
              {user?.role === "admin" ? "Global Alerts" : "My Active Alerts"} 
              {quickStats.activeCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {quickStats.activeCount}
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

      {activeTab === "alerts" && (
        <div className="space-y-6">
          {/* Enhanced System Status - Alert Coverage only shown to admins */}
          <div className={`grid grid-cols-1 gap-4 ${userRole === "admin" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <div className={`p-4 rounded-xl border ${
              systemStatus.connected && systemStatus.initialized
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  systemStatus.connected && systemStatus.initialized ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className={`text-sm font-medium ${
                  systemStatus.connected && systemStatus.initialized
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  System: {systemStatus.connected && systemStatus.initialized ? 'Active' : 'Initializing'}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {quickStats.devicesMonitored} devices monitored
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Processing: {isProcessing ? 'Active' : 'Idle'}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Last update: {lastProcessed ? formatTimestamp(lastProcessed) : 'Never'}
              </p>
            </div>

            {/* Alert Coverage - Only show to admins */}
            {userRole === "admin" && (
              <div className="p-4 rounded-xl border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Alert Coverage
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {thresholds.filter(t => t.isActive).length} active thresholds
                </p>
              </div>
            )}
          </div>
          
          {userRole === "admin" && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 mb-1">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total Alerts</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-red-600 mb-1">{stats.active}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Active</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.acknowledged}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Acknowledged</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-green-600 mb-1">{stats.resolved}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Resolved</div>
              </div>
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
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
              <select
                value={filters.severity}
                onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
              </select>
            </div>
          </div>

          {alertsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertTriangle size={16} />
                {alertsError}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {alertsLoading && !isInitialized ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">Loading global alerts system...</span>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Alerts Found</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {filters.search || filters.status !== "all" || filters.severity !== "all"
                    ? "No alerts match your current filters."
                    : systemStatus.initialized 
                      ? "No alerts have been generated. Your systems are running normally."
                      : "Alert system is initializing..."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Device & Parameter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{alert.deviceName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{alert.parameterDisplayName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{alert.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {alert.currentValue}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Threshold: {alert.thresholdValue}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Count: {alert.occurrenceCount}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              alert.alertLevel === 'critical' 
                                ? 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
                                : 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}
                          >
                            {alert.alertLevel}
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
                            {formatTimestamp(alert.lastUpdated)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {alert.status === "active" && (
                              <button
                                onClick={() => handleAlertActionLocal(alert.id, "acknowledged")}
                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                title="Acknowledge"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            {(alert.status === "active" || alert.status === "acknowledged") && (
                              <button
                                onClick={() => handleAlertActionLocal(alert.id, "resolved")}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                title="Resolve"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            {userRole === "admin" && (
                              <button
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

      {activeTab === "thresholds" && userRole === "admin" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Threshold Configuration</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Configure alert thresholds for device parameters. Changes will trigger global alert system refresh.
              </p>
            </div>
          </div>

          {/* Only show save errors in UI, not fetch errors */}
          {saveError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertTriangle size={16} />
                {saveError}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {thresholdLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">Loading thresholds...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Parameter</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Warning Threshold</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Critical Threshold</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {localThresholds.map((threshold) => (
                      <tr key={threshold.parameter} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getParameterDisplayName(threshold.parameter)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {threshold.parameter}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingThreshold?.parameter === threshold.parameter ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editedValues.warningThreshold}
                              onChange={(e) => setEditedValues(prev => ({ ...prev, warningThreshold: e.target.value }))}
                              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Warning"
                            />
                          ) : (
                            <span className={`text-sm ${threshold.warningThreshold !== null ? "font-semibold text-yellow-600 dark:text-yellow-400" : "text-gray-400"}`}>
                              {threshold.warningThreshold !== null ? threshold.warningThreshold : "Not Set"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingThreshold?.parameter === threshold.parameter ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editedValues.criticalThreshold}
                              onChange={(e) => setEditedValues(prev => ({ ...prev, criticalThreshold: e.target.value }))}
                              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Critical"
                            />
                          ) : (
                            <span className={`text-sm ${threshold.criticalThreshold !== null ? "font-semibold text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                              {threshold.criticalThreshold !== null ? threshold.criticalThreshold : "Not Set"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingThreshold?.parameter === threshold.parameter ? (
                            <textarea
                              value={editedValues.description}
                              onChange={(e) => setEditedValues(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              placeholder="Optional description..."
                              rows="2"
                            />
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                              {threshold.description || (
                                <span className="text-gray-400 italic">No description</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingThreshold?.parameter === threshold.parameter ? (
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editedValues.isActive}
                                onChange={(e) => setEditedValues(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                              />
                              <span className="text-sm text-gray-900 dark:text-white">Active</span>
                            </label>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              threshold.isActive 
                                ? "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200"
                                : "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
                            }`}>
                              {threshold.isActive ? "Active" : "Inactive"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {editingThreshold?.parameter === threshold.parameter ? (
                              <>
                                <button
                                  onClick={handleSaveThreshold}
                                  className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                  title="Save"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                  title="Cancel"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleEditThreshold(threshold)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
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
    </div>
  )
}

export default AlertsPage