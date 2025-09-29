"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { tankApi } from "../utils/api"
import { toast } from "react-hot-toast"
import {
  ArrowLeft,
  Droplet,
  Activity,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  MapPin,
  Gauge,
  Database,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import EnhancedTankVisualization from "../components/EnhancedTankVisualization"
import MonthSelector from "../components/MonthSelector"
import VolumeMonitor from "../components/VolumeMonitor"

// Enhanced Loading Component
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
    <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
      <div className="relative mb-6">
        <Activity className="animate-spin h-16 w-16 text-blue-500 mx-auto" />
        <div className="absolute inset-0 h-16 w-16 mx-auto border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
      </div>
      <p className="text-xl text-blue-600 dark:text-blue-400 font-medium">{message}</p>
      <div className="mt-4 flex justify-center space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
      </div>
    </div>
  </div>
)

// Enhanced Error Component
const ErrorDisplay = ({ error, onRetry, onBack }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
    <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-red-200/50 dark:border-red-700/50 max-w-md">
      <div className="relative mb-6">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
        <div className="absolute -top-1 -right-1 h-6 w-6 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Tank Not Found</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
        {error || "The requested tank could not be found or there was an error loading the data."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onRetry}
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
        <button
          onClick={onBack}
          className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tanks
        </button>
      </div>
    </div>
  </div>
)

// Status Badge Component
const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "critical":
        return {
          color: "text-red-700 bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
          icon: AlertCircle,
          pulse: true,
        }
      case "high":
      case "warning":
        return {
          color:
            "text-orange-700 bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
          icon: AlertTriangle,
          pulse: true,
        }
      case "low":
        return {
          color:
            "text-yellow-700 bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
          icon: AlertCircle,
          pulse: false,
        }
      case "offline":
        return {
          color:
            "text-gray-700 bg-gray-100 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800",
          icon: WifiOff,
          pulse: false,
        }
      default:
        return {
          color:
            "text-green-700 bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
          icon: CheckCircle,
          pulse: false,
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${config.color} ${config.pulse ? "animate-pulse" : ""}`}
    >
      <Icon className="w-4 h-4" />
      <span>{status?.charAt(0).toUpperCase() + status?.slice(1) || "Unknown"}</span>
    </div>
  )
}

// Header Component
const TankHeader = ({ tank, onBack, onRefresh, refreshing, lastUpdated }) => (
  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transform hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Droplet className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            {tank.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <p className="text-gray-600 dark:text-gray-400">{tank.location}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <StatusBadge status={tank.status} />

        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  </div>
)

// Tank Visualization Card
const TankVisualizationCard = ({ tank }) => (
  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Gauge className="text-blue-600 dark:text-blue-400" size={20} />
        </div>
        Live Tank Status
      </h2>
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Real-time</span>
      </div>
    </div>

    <div className="flex justify-center mb-6">
      <EnhancedTankVisualization
        tank={tank}
        fillPercentage={tank.currentFillPercentage || 0}
        currentVolume={tank.currentVolumeLiters || 0}
        capacity={tank.capacity || 1000}
        status={tank.currentFillPercentage >= 90 ? "critical" : tank.currentFillPercentage >= 80 ? "warning" : "normal"}
        animated={true}
        showDetails={true}
        size="large"
      />
    </div>
  </div>
)

// Tank Information Card
const TankInformationCard = ({ tank }) => (
  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <Database className="text-green-600 dark:text-green-400" size={20} />
      </div>
      Tank Information
    </h2>

    {/* Key Metrics Grid */}
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <Droplet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">Current Volume</span>
        </div>
        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
          {(tank.currentVolumeLiters || 0).toLocaleString()} L
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-300 font-medium text-sm">Total Capacity</span>
        </div>
        <p className="text-2xl font-bold text-green-800 dark:text-green-200">
          {(tank.capacity || 0).toLocaleString()} L
        </p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="text-purple-700 dark:text-purple-300 font-medium text-sm">Fill Level</span>
        </div>
        <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
          {(tank.currentFillPercentage || 0).toFixed(1)}%
        </p>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <span className="text-orange-700 dark:text-orange-300 font-medium text-sm">Tank Shape</span>
        </div>
        <p className="text-lg font-bold text-orange-800 dark:text-orange-200 capitalize">{tank.shape || "Unknown"}</p>
      </div>
    </div>

    {/* Additional Details */}
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Technical Specifications
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Material Type:</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {tank.materialType || "Unknown"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Orientation:</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {tank.orientation || "Unknown"}
            </span>
          </div>
        </div>
      </div>

      {tank.device && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Connected Device
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Device Name:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {tank.device.name || tank.device.serialNumber}
            </span>
          </div>
        </div>
      )}

      {tank.alertThresholds && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Alert Thresholds
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
              <span className="text-yellow-700 dark:text-yellow-300 text-xs font-medium block">Low</span>
              <p className="font-bold text-yellow-800 dark:text-yellow-200">{tank.alertThresholds.low || "N/A"}%</p>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
              <span className="text-orange-700 dark:text-orange-300 text-xs font-medium block">High</span>
              <p className="font-bold text-orange-800 dark:text-orange-200">{tank.alertThresholds.high || "N/A"}%</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
              <span className="text-red-700 dark:text-red-300 text-xs font-medium block">Critical</span>
              <p className="font-bold text-red-800 dark:text-red-200">{tank.alertThresholds.critical || "N/A"}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)

// Volume Monitoring Card
const VolumeMonitoringCard = ({
  tank,
  volumeHistory,
  historyLoading,
  selectedRange,
  handleDateRangeChange,
  handleRangeChange,
}) => (
  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <BarChart3 className="text-purple-600 dark:text-purple-400" size={20} />
        </div>
        Volume Monitoring & Analytics
      </h2>
      {historyLoading && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
          <Activity className="animate-spin h-4 w-4 text-blue-500" />
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Loading data...</span>
        </div>
      )}
    </div>

    {/* Month Selector */}
    <div className="mb-6">
      <MonthSelector
        onDateRangeChange={handleDateRangeChange}
        selectedRange={selectedRange}
        setSelectedRange={handleRangeChange}
      />
    </div>

    {/* Volume Monitor Component */}
    <VolumeMonitor volumeHistory={volumeHistory} tank={tank} timeRange={selectedRange} isLoading={historyLoading} />

    {/* Data Summary */}
    {volumeHistory.length > 0 && (
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">Data Points</span>
          </div>
          <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{volumeHistory.length.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300 text-sm font-medium">Latest Reading</span>
          </div>
          <p className="text-xl font-bold text-green-800 dark:text-green-200">
            {new Date(volumeHistory[volumeHistory.length - 1]?.timestamp).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-purple-700 dark:text-purple-300 text-sm font-medium">Time Range</span>
          </div>
          <p className="text-sm font-bold text-purple-800 dark:text-purple-200 capitalize">
            {selectedRange || "Custom Range"}
          </p>
        </div>
      </div>
    )}
  </div>
)

// Main Component
const TankDetailsPage = () => {
  const { tankId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  // State management
  const [tank, setTank] = useState(null)
  const [volumeHistory, setVolumeHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedRange, setSelectedRange] = useState("daily")
  const [customDateRange, setCustomDateRange] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const tankDataRef = useRef(null)
  const volumeHistoryRef = useRef([])

  const fetchTankDetails = useCallback(
    async (showToast = false) => {
      try {
        setRefreshing(true)
        console.log("[v0] Fetching tank details for ID:", tankId)
        const result = await tankApi.getTankById(tankId)
        if (result.success) {
          tankDataRef.current = result.data
          setTank((prevTank) => {
            if (!prevTank || JSON.stringify(prevTank) !== JSON.stringify(result.data)) {
              return result.data
            }
            return prevTank
          })
          setError(null)
          setLastUpdated(new Date())
          if (showToast) {
            toast.success("Tank data updated")
          }
          console.log("[v0] Tank details updated:", result.data.name)
        } else {
          setError(result.message || "Failed to fetch tank details")
          if (showToast) {
            toast.error(result.message || "Failed to fetch tank details")
          }
        }
      } catch (err) {
        console.error("[v0] Error fetching tank details:", err)
        setError("Failed to load tank details")
        if (showToast) {
          toast.error("Failed to load tank details")
        }
      } finally {
        setRefreshing(false)
      }
    },
    [tankId],
  )

  const fetchVolumeHistory = useCallback(async () => {
    if (!tankId) {
      console.warn("[v0] No tankId provided for volume history fetch")
      return
    }

    try {
      setHistoryLoading(true)
      const params = { limit: 1000 }

      if (customDateRange) {
        params.startDate = customDateRange.startDate.toISOString()
        params.endDate = customDateRange.endDate.toISOString()
        console.log("[v0] Using custom date range:", params)
      } else if (selectedRange) {
        params.timeRange = selectedRange
        console.log("[v0] Using predefined time range:", params)
      } else {
        console.log("[v0] No date range selected, not fetching history.")
        setVolumeHistory([])
        return
      }

      const result = await tankApi.getTankVolumeHistory(tankId, params)

      console.log("[v0] Volume history API response:", {
        success: result.success,
        dataLength: result.data?.length || 0,
        message: result.message,
      })

      if (result.success && Array.isArray(result.data)) {
        const transformedData = result.data
          .filter((item) => item && item.timestamp)
          .map((item) => ({
            timestamp: item.timestamp,
            volumeLiters: Number(item.volumeLiters) || 0,
            fillPercentage: Number(item.fillPercentage) || 0,
            rawSensorReading: item.rawSensorReading,
            dataQuality: item.dataQuality || "good",
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        volumeHistoryRef.current = transformedData
        setVolumeHistory((prevHistory) => {
          if (JSON.stringify(prevHistory) !== JSON.stringify(transformedData)) {
            return transformedData
          }
          return prevHistory
        })

        console.log("[v0] Volume history processed:", {
          originalLength: result.data.length,
          transformedLength: transformedData.length,
          dateRange:
            transformedData.length > 0
              ? {
                  from: transformedData[0].timestamp,
                  to: transformedData[transformedData.length - 1].timestamp,
                }
              : null,
        })
      } else {
        console.warn("[v0] Invalid volume history response:", result)
        setVolumeHistory([])
        if (!result.success && result.message) {
          toast.error(`Volume history: ${result.message}`)
        }
      }
    } catch (err) {
      console.error("[v0] Error fetching volume history:", err)
      setVolumeHistory([])
      toast.error("Failed to load volume history")
    } finally {
      setHistoryLoading(false)
    }
  }, [tankId, customDateRange, selectedRange])

  // Handle date range change from MonthSelector
  const handleDateRangeChange = useCallback((startDate, endDate) => {
    console.log("[v0] Date range changed:", { startDate, endDate })
    setCustomDateRange({ startDate, endDate })
    setSelectedRange("") // Deselect predefined range
  }, [])

  // Handle predefined range selection change
  const handleRangeChange = useCallback((newRange) => {
    console.log("[v0] Predefined range changed to:", newRange)
    setCustomDateRange(null) // Clear custom range
    setSelectedRange(newRange)
  }, [])

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    console.log("[v0] Manual refresh triggered")
    fetchTankDetails(true)
    fetchVolumeHistory()
  }, [fetchTankDetails, fetchVolumeHistory])

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && tankId) {
      console.log("[v0] Initial data fetch for tank:", tankId)
      setLoading(true)
      fetchTankDetails().finally(() => setLoading(false))
    }
  }, [isAuthenticated, tankId, fetchTankDetails])

  useEffect(() => {
    // Fetch history whenever the relevant state changes
    if (tank) {
      console.log("[v0] Fetching history for range:", customDateRange ? "custom" : selectedRange)
      fetchVolumeHistory()
    }
  }, [tank, selectedRange, customDateRange, fetchVolumeHistory])

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Loading tank details..." />
  }

  // Error state
  if (error || !tank) {
    return <ErrorDisplay error={error} onRetry={handleManualRefresh} onBack={() => navigate("/tanks")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="p-6 space-y-6">
        {/* Header */}
        <TankHeader
          tank={tank}
          onBack={() => navigate("/tanks")}
          onRefresh={handleManualRefresh}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Tank Visualization */}
          <TankVisualizationCard tank={tank} />

          {/* Tank Information */}
          <TankInformationCard tank={tank} />
        </div>

        {/* Volume Monitoring Section */}
        <VolumeMonitoringCard
          tank={tank}
          volumeHistory={volumeHistory}
          historyLoading={historyLoading}
          selectedRange={selectedRange}
          handleDateRangeChange={handleDateRangeChange}
          handleRangeChange={handleRangeChange}
        />
      </div>
    </div>
  )
}

export default TankDetailsPage
