import React from 'react';
import { useSystemMonitoring } from '../hooks/useSystemMonitoring';
import { Activity, Server, Database, Wifi, AlertTriangle, CheckCircle, XCircle, RefreshCw, BarChart3, Globe } from 'lucide-react';

const SystemMonitoringWidget = ({
  className = "",
  showDetails = false,
  refreshInterval = 30000
}) => {
  const {
    systemHealth,
    systemStats,
    loading,
    error,
    lastUpdated,
    manualRefresh,
    isHealthy,
    isDegraded,
    isUnhealthy
  } = useSystemMonitoring({
    enableAutoRefresh: true,
    refreshInterval,
    enableHealthCheck: true,
    enableStats: true,
  });

  const getStatusIcon = () => {
    if (loading) return <Activity className="w-5 h-5 animate-spin text-blue-500" />;
    if (isHealthy) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (isDegraded) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    if (isUnhealthy) return <XCircle className="w-5 h-5 text-red-500" />;
    return <Server className="w-5 h-5 text-gray-500" />;
  };

  const getStatusColor = () => {
    if (isHealthy) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (isDegraded) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (isUnhealthy) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (!showDetails) {
    // Compact widget for header/sidebar
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor()}`}>
          {systemHealth?.status || "Unknown"}
        </span>
        <button
          onClick={manualRefresh}
          disabled={loading}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title="Refresh monitoring data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    );
  }

  // Detailed monitoring panel
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Monitoring</h3>
            {lastUpdated && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={manualRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 dark:text-red-400 font-medium">Monitoring Error</span>
            </div>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* System Health */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </h4>
            {systemHealth ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor()}`}>
                    {systemHealth.status}
                  </span>
                </div>
                {systemHealth.uptime && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatUptime(systemHealth.uptime)}
                    </span>
                  </div>
                )}
                {systemHealth.memory && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatMemory(systemHealth.memory.heapUsed)} / {formatMemory(systemHealth.memory.heapTotal)}
                    </span>
                  </div>
                )}
                {systemHealth.services && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Services</span>
                    {Object.entries(systemHealth.services).map(([service, data]) => (
                      <div
                        key={service}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {service === "database" && <Database className="w-4 h-4 text-gray-500" />}
                          {service === "websocket" && <Wifi className="w-4 h-4 text-gray-500" />}
                          {service === "api" && <Globe className="w-4 h-4 text-gray-500" />}
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{service}</span>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${data.status === "healthy"
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
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Health data unavailable</p>
              </div>
            )}
          </div>

          {/* System Statistics */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics (24h)
            </h4>
            {systemStats ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Readings</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemStats.totalRawReadings?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active Devices</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemStats.uniqueDeviceCount || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sensor Types</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemStats.uniqueSensorTypeCount || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Error Rate</span>
                  <span
                    className={`text-sm font-medium ${(systemStats.errorRate || 0) > 0.1
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                      }`}
                  >
                    {((systemStats.errorRate || 0) * 100).toFixed(2)}%
                  </span>
                </div>
                {systemStats.avgTemperature && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Temperature</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {systemStats.avgTemperature.toFixed(1)}°C
                    </span>
                  </div>
                )}
                {systemStats.avgHumidity && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Humidity</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {systemStats.avgHumidity.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Statistics unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoringWidget;
