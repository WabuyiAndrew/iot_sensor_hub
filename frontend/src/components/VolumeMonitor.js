"use client"

import { useMemo } from "react"
import { Plus, Minus, Droplet, TrendingUp, TrendingDown, Activity } from "lucide-react"

const VolumeMonitor = ({ volumeHistory, tank, timeRange, isLoading = false }) => {
  const volumeData = useMemo(() => {
    if (!volumeHistory || volumeHistory.length < 2) {
      return {
        volumeAdded: 0,
        volumeUsed: 0,
        volumeRemaining: tank?.currentVolumeLiters || 0,
        netChange: 0,
        additionCount: 0,
        usageCount: 0,
        dataPoints: volumeHistory?.length || 0,
        timeSpan: null,
      }
    }

    // Sort by timestamp to ensure proper order
    const sortedHistory = [...volumeHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )

    let totalAdded = 0
    let totalUsed = 0
    let additionCount = 0
    let usageCount = 0

    // Calculate volume changes between consecutive readings
    for (let i = 1; i < sortedHistory.length; i++) {
      const current = Number(sortedHistory[i].volumeLiters) || 0
      const previous = Number(sortedHistory[i - 1].volumeLiters) || 0
      const change = current - previous

      // Filter significant changes (>= 10L to avoid sensor noise)
      // Different thresholds based on tank capacity
      const threshold = tank?.capacity ? Math.max(tank.capacity * 0.001, 5) : 10

      if (Math.abs(change) >= threshold) {
        if (change > 0) {
          totalAdded += change
          additionCount++
        } else {
          totalUsed += Math.abs(change)
          usageCount++
        }
      }
    }

    const currentVolume = sortedHistory[sortedHistory.length - 1].volumeLiters
    const initialVolume = sortedHistory[0].volumeLiters
    const netChange = currentVolume - initialVolume

    // Calculate time span
    const timeSpan = {
      start: new Date(sortedHistory[0].timestamp),
      end: new Date(sortedHistory[sortedHistory.length - 1].timestamp),
    }

    return {
      volumeAdded: totalAdded,
      volumeUsed: totalUsed,
      volumeRemaining: currentVolume,
      netChange,
      additionCount,
      usageCount,
      dataPoints: sortedHistory.length,
      timeSpan,
    }
  }, [volumeHistory, tank])

  const formatVolume = (volume) => {
    if (Math.abs(volume) >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`
    }
    return Math.round(volume).toLocaleString()
  }

  const getTimeRangeLabel = () => {
    if (timeRange?.startsWith('month-')) {
      const [, year, month] = timeRange.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }

    switch (timeRange) {
      case "daily":
        return "Last 24 Hours"
      case "weekly":
        return "Last 7 Days"
      case "monthly":
        return "Last 30 Days"
      default:
        return "Selected Period"
    }
  }

  const getCapacityPercentage = () => {
    if (!tank?.capacity) return 0
    return ((volumeData.volumeRemaining / tank.capacity) * 100).toFixed(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading volume data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Volume Monitoring - {getTimeRangeLabel()}
        </h3>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
          <span>{volumeData.dataPoints} readings analyzed</span>
          {volumeData.timeSpan && (
            <span>
              {volumeData.timeSpan.start.toLocaleDateString()} - {volumeData.timeSpan.end.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {volumeHistory.length === 0 ? (
        <div className="text-center py-8">
          <Droplet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Volume Data Available</h3>
          <p className="text-gray-500 dark:text-gray-400">
            No volume history found for the selected time period. Data may not be available or the tank might not have any recorded measurements.
          </p>
        </div>
      ) : volumeHistory.length < 2 ? (
        <div className="text-center py-8">
          <Droplet className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Insufficient Data</h3>
          <p className="text-gray-500 dark:text-gray-400">
            At least 2 readings are required to calculate volume changes. Currently have {volumeHistory.length} reading(s).
          </p>
        </div>
      ) : (
        <>
          {/* Main Volume Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Volume Added */}
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 transition-all hover:shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-green-800 dark:text-green-200">Volume Added</h4>
                    <p className="text-sm text-green-600 dark:text-green-400">{volumeData.additionCount} additions</p>
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                {formatVolume(volumeData.volumeAdded)} L
              </p>
            </div>

            {/* Volume Used */}
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border-2 border-red-200 dark:border-red-800 transition-all hover:shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <Minus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-red-800 dark:text-red-200">Volume Used</h4>
                    <p className="text-sm text-red-600 dark:text-red-400">{volumeData.usageCount} usage events</p>
                  </div>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-red-800 dark:text-red-200">{formatVolume(volumeData.volumeUsed)} L</p>
            </div>

            {/* Volume Remaining */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800 transition-all hover:shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Droplet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Volume Remaining</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Current level</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {getCapacityPercentage()}%
                  </p>
                </div>
              </div>
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                {formatVolume(volumeData.volumeRemaining)} L
              </p>
            </div>
          </div>

          {/* Net Change Summary */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Net Change</h4>
                <p
                  className={`text-2xl font-bold ${volumeData.netChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {volumeData.netChange >= 0 ? "+" : ""}
                  {formatVolume(volumeData.netChange)} L
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {volumeData.netChange >= 0 ? "Gained" : "Lost"} during period
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Activity</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatVolume(volumeData.volumeAdded + volumeData.volumeUsed)} L
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Combined additions & usage
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Quality</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {volumeData.dataPoints}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Data points analyzed
                </p>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          {(volumeData.additionCount > 0 || volumeData.usageCount > 0) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Activity Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {volumeData.additionCount} addition event{volumeData.additionCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-red-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {volumeData.usageCount} usage event{volumeData.usageCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default VolumeMonitor