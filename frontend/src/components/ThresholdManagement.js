"use client"

import { useState, useEffect } from "react"
import {
  Settings,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Equal,
  Equal as NotEqual,
} from "lucide-react"

const ThresholdManagement = ({ userRole, axiosInstance }) => {
  const [thresholds, setThresholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingThreshold, setEditingThreshold] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [stats, setStats] = useState(null)

  // Parameter options with their default units
  const parameterOptions = [
    { value: "temperature", label: "Temperature", unit: "°C", icon: "🌡️" },
    { value: "humidity", label: "Humidity", unit: "%", icon: "💧" },
    { value: "pm25", label: "PM2.5", unit: "μg/m³", icon: "🌫️" },
    { value: "pm10", label: "PM10", unit: "μg/m³", icon: "🌫️" },
    { value: "co2", label: "CO2", unit: "ppm", icon: "💨" },
    { value: "atmosphericPressure", label: "Atmospheric Pressure", unit: "hPa", icon: "🌪️" },
    { value: "windSpeed", label: "Wind Speed", unit: "m/s", icon: "💨" },
    { value: "windDir", label: "Wind Direction", unit: "°", icon: "🧭" },
    { value: "rainfall", label: "Rainfall", unit: "mm", icon: "🌧️" },
    { value: "totalSolarRadiation", label: "Solar Radiation", unit: "W/m²", icon: "☀️" },
    { value: "noise", label: "Noise Level", unit: "dB", icon: "🔊" },
    { value: "ultrasonic_liquid_level", label: "Ultrasonic Level", unit: "cm", icon: "📏" },
    { value: "pressure_level", label: "Pressure Level", unit: "bar", icon: "⚡" },
    { value: "liquid_level_raw", label: "Raw Liquid Level", unit: "raw", icon: "📊" },
    { value: "signalStrength", label: "Signal Strength", unit: "dBm", icon: "📶" },
  ]

  const thresholdTypes = [
    { value: "greater_than", label: "Greater Than", icon: <TrendingUp size={16} /> },
    { value: "less_than", label: "Less Than", icon: <TrendingDown size={16} /> },
    { value: "equals", label: "Equals", icon: <Equal size={16} /> },
    { value: "not_equals", label: "Not Equals", icon: <NotEqual size={16} /> },
  ]

  // Fetch thresholds
  const fetchThresholds = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get("/api/alert-thresholds")
      setThresholds(response.data.data || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching thresholds:", err)
      setError("Failed to fetch alert thresholds")
    } finally {
      setLoading(false)
    }
  }

  // Fetch statistics (admin only)
  const fetchStats = async () => {
    if (userRole !== "admin") return

    try {
      const response = await axiosInstance.get("/api/alert-thresholds/stats")
      setStats(response.data.data)
    } catch (err) {
      console.error("Error fetching threshold stats:", err)
    }
  }

  useEffect(() => {
    fetchThresholds()
    fetchStats()
  }, [])

  // Handle create/update threshold
  const handleSaveThreshold = async (thresholdData) => {
    try {
      if (editingThreshold) {
        // Update existing threshold
        await axiosInstance.put(`/api/alert-thresholds/${editingThreshold._id}`, thresholdData)
      } else {
        // Create new threshold
        await axiosInstance.post("/api/alert-thresholds", thresholdData)
      }

      await fetchThresholds()
      await fetchStats()
      setEditingThreshold(null)
      setShowCreateForm(false)
    } catch (err) {
      console.error("Error saving threshold:", err)
      setError(err.response?.data?.message || "Failed to save threshold")
    }
  }

  // Handle delete threshold
  const handleDeleteThreshold = async (thresholdId) => {
    if (!window.confirm("Are you sure you want to delete this threshold?")) return

    try {
      await axiosInstance.delete(`/api/alert-thresholds/${thresholdId}`)
      await fetchThresholds()
      await fetchStats()
    } catch (err) {
      console.error("Error deleting threshold:", err)
      setError(err.response?.data?.message || "Failed to delete threshold")
    }
  }

  // Initialize default thresholds
  const handleInitializeDefaults = async () => {
    if (!window.confirm("This will create default thresholds for common parameters. Continue?")) return

    try {
      await axiosInstance.post("/api/alert-thresholds/initialize-defaults")
      await fetchThresholds()
      await fetchStats()
    } catch (err) {
      console.error("Error initializing defaults:", err)
      setError(err.response?.data?.message || "Failed to initialize default thresholds")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading thresholds...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="text-blue-600" size={24} />
            Alert Thresholds
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Configure alert thresholds for sensor parameters</p>
        </div>

        {userRole === "admin" && (
          <div className="flex gap-2">
            {thresholds.length === 0 && (
              <button
                onClick={handleInitializeDefaults}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Initialize Defaults
              </button>
            )}
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add Threshold
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards (Admin only) */}
      {userRole === "admin" && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Thresholds</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Active</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Inactive</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{stats.byType?.length || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Types Configured</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle size={16} />
            {error}
          </div>
        </div>
      )}

      {/* Thresholds List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {thresholds.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Alert Thresholds Configured</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Get started by creating your first alert threshold or initializing defaults.
            </p>
            {userRole === "admin" && (
              <button
                onClick={handleInitializeDefaults}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Initialize Default Thresholds
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Parameter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Warning
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Critical
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  {userRole === "admin" && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {thresholds.map((threshold) => {
                  const parameterInfo = parameterOptions.find((p) => p.value === threshold.parameter)
                  const typeInfo = thresholdTypes.find((t) => t.value === threshold.thresholdType)

                  return (
                    <tr key={threshold._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{parameterInfo?.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {parameterInfo?.label || threshold.parameter}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{threshold.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                          {threshold.warningThreshold} {threshold.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                          {threshold.criticalThreshold} {threshold.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                          {typeInfo?.icon}
                          {typeInfo?.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            threshold.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {threshold.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {userRole === "admin" && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingThreshold(threshold)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteThreshold(threshold._id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingThreshold) && (
        <ThresholdForm
          threshold={editingThreshold}
          parameterOptions={parameterOptions}
          thresholdTypes={thresholdTypes}
          existingParameters={thresholds.map((t) => t.parameter)}
          onSave={handleSaveThreshold}
          onCancel={() => {
            setShowCreateForm(false)
            setEditingThreshold(null)
          }}
        />
      )}
    </div>
  )
}

// Threshold Form Component
const ThresholdForm = ({ threshold, parameterOptions, thresholdTypes, existingParameters, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    parameter: threshold?.parameter || "",
    warningThreshold: threshold?.warningThreshold || "",
    criticalThreshold: threshold?.criticalThreshold || "",
    thresholdType: threshold?.thresholdType || "greater_than",
    unit: threshold?.unit || "",
    description: threshold?.description || "",
    isActive: threshold?.isActive !== undefined ? threshold.isActive : true,
  })

  const [errors, setErrors] = useState({})

  // Update unit when parameter changes
  useEffect(() => {
    if (formData.parameter && !threshold) {
      const parameterInfo = parameterOptions.find((p) => p.value === formData.parameter)
      if (parameterInfo) {
        setFormData((prev) => ({ ...prev, unit: parameterInfo.unit }))
      }
    }
  }, [formData.parameter, parameterOptions, threshold])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.parameter) newErrors.parameter = "Parameter is required"
    if (!threshold && existingParameters.includes(formData.parameter)) {
      newErrors.parameter = "Threshold for this parameter already exists"
    }
    if (!formData.warningThreshold) newErrors.warningThreshold = "Warning threshold is required"
    if (!formData.criticalThreshold) newErrors.criticalThreshold = "Critical threshold is required"
    if (!formData.unit) newErrors.unit = "Unit is required"

    // Validate threshold logic
    if (formData.warningThreshold && formData.criticalThreshold) {
      const warning = Number.parseFloat(formData.warningThreshold)
      const critical = Number.parseFloat(formData.criticalThreshold)

      if (formData.thresholdType === "greater_than" && warning >= critical) {
        newErrors.criticalThreshold = "Critical threshold must be greater than warning threshold"
      } else if (formData.thresholdType === "less_than" && warning <= critical) {
        newErrors.criticalThreshold = "Critical threshold must be less than warning threshold"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      onSave({
        ...formData,
        warningThreshold: Number.parseFloat(formData.warningThreshold),
        criticalThreshold: Number.parseFloat(formData.criticalThreshold),
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {threshold ? "Edit Threshold" : "Create Threshold"}
            </h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Parameter Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parameter</label>
              <select
                value={formData.parameter}
                onChange={(e) => setFormData((prev) => ({ ...prev, parameter: e.target.value }))}
                disabled={!!threshold}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
              >
                <option value="">Select parameter...</option>
                {parameterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
              {errors.parameter && <p className="text-red-600 text-sm mt-1">{errors.parameter}</p>}
            </div>

            {/* Threshold Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Threshold Type</label>
              <select
                value={formData.thresholdType}
                onChange={(e) => setFormData((prev) => ({ ...prev, thresholdType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {thresholdTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Warning Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Warning Threshold
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={formData.warningThreshold}
                  onChange={(e) => setFormData((prev) => ({ ...prev, warningThreshold: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter warning threshold"
                />
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Unit"
                />
              </div>
              {errors.warningThreshold && <p className="text-red-600 text-sm mt-1">{errors.warningThreshold}</p>}
            </div>

            {/* Critical Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Critical Threshold
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={formData.criticalThreshold}
                  onChange={(e) => setFormData((prev) => ({ ...prev, criticalThreshold: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter critical threshold"
                />
                <div className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                  {formData.unit}
                </div>
              </div>
              {errors.criticalThreshold && <p className="text-red-600 text-sm mt-1">{errors.criticalThreshold}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe what this threshold monitors..."
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Active (threshold will be monitored)
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                {threshold ? "Update" : "Create"} Threshold
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ThresholdManagement
