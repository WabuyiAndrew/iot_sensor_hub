import { useState, useEffect, useMemo, useCallback } from "react"
import { useOutletContext } from "react-router-dom"
import { useCookies } from "react-cookie"
import axios from "axios"
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { toast } from "react-hot-toast"
import { Link } from "react-router-dom"
import {
  MapPin,
  Navigation,
  Search,
  Eye,
  HardDrive,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  Activity,
  AlertTriangle,
  Filter,
} from "lucide-react"

// Fix for default marker icon issue with Webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

// Define the mapping between display names (frontend) and backend enum values
const deviceTypeMap = {
  "Air Quality": "air_quality",
  Weather: "WeatherS",
  "Liquid Level": "liquid_level",
  "Multi Sensor": "multi_sensor",
  Generic: "generic",
}

// Reverse map for populating the form from backend data
const reverseDeviceTypeMap = Object.entries(deviceTypeMap).reduce((acc, [key, value]) => {
  acc[value] = key
  return acc
}, {})

// OSM-only tile layer configurations (no API keys required)
const osmTileLayerConfigs = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: "Standard"
  },
  humanitarian: {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
    name: "Humanitarian"
  },
  cycle: {
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a>',
    name: "CyclOSM"
  },
}

// Generate alerts from sensor data (same logic as alerts page)
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

const MapPage = () => {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mapStyle, setMapStyle] = useState("standard")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [cookies] = useCookies(["token"])

  const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

  // Get data from context for alerts
  const { userRole, allDevicesSensorData, globalAlerts, userInfo } = useOutletContext()

  // Generate alerts from the context data
  const alerts = useMemo(() => {
    if (globalAlerts && globalAlerts.length >= 0) {
      return globalAlerts
    }
    return generateAlertsFromAllDevices(allDevicesSensorData || {}, userInfo || { role: userRole })
  }, [globalAlerts, allDevicesSensorData, userInfo, userRole])

  // Automatic refresh every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date())
      // Silent refresh in background
      fetchDevices()
    }, 45000)

    return () => clearInterval(interval)
  }, [])

  // Fetch real devices from API
  // Fetch devices from API with role-based logic
const fetchDevices = useCallback(async () => {
  if (!loading) setRefreshing(true);
  setError(null);

  if (!cookies.token) {
    setError("You are not authenticated. Please log in to view device locations.");
    setLoading(false);
    setRefreshing(false);
    return;
  }

  // CRITICAL FIX: Select the correct endpoint based on user role
  const endpoint = userRole === "admin" ? `${baseurl}/api/devices` : `${baseurl}/api/devices/my-devices`;

  try {
    console.log(`[MapPage] Fetching devices from ${endpoint}...`);

    // Prepare API params based on user role and filters
    const params = {};
    // Only apply filters/search for the admin route
    if (userRole === "admin") {
      if (filterType !== "all") params.type = deviceTypeMap[filterType];
      if (filterStatus !== "all") params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
    }

    const response = await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${cookies.token}` },
      params,
    });

    console.log("[MapPage] Devices API response:", response.data);
    const fetchedDevices = response.data.data || [];

    // Filter devices that have valid GPS coordinates
    const devicesWithGPS = fetchedDevices.filter(
      (d) =>
        d &&
        d.gpsCoordinates &&
        typeof d.gpsCoordinates.latitude === "number" &&
        !isNaN(d.gpsCoordinates.latitude) &&
        typeof d.gpsCoordinates.longitude === "number" &&
        !isNaN(d.gpsCoordinates.longitude) &&
        d.gpsCoordinates.latitude !== null &&
        d.gpsCoordinates.longitude !== null &&
        Math.abs(d.gpsCoordinates.latitude) <= 90 &&
        Math.abs(d.gpsCoordinates.longitude) <= 180
    );

    console.log("[MapPage] Devices with valid GPS:", devicesWithGPS);
    setDevices(devicesWithGPS);
    setError(null);
  } catch (err) {
    console.error("Error fetching device locations:", err.response?.data || err.message);
    const errorMessage =
      err.response?.data?.message ||
      "Failed to load device locations. Please ensure you are logged in and have permission.";
    setError(errorMessage);
    if (loading) {
      toast.error(errorMessage);
    }
    setDevices([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [baseurl, cookies.token, filterType, filterStatus, searchTerm, loading, userRole]);

  // Fetch devices on component mount and when filters change
  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  // Dark Mode Logic
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"))
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  // Frontend device types for display in dropdowns
  const displayDeviceTypes = Object.keys(deviceTypeMap)

  // Custom icons for different device types and statuses
  const getDeviceIcon = (device) => {
    const deviceAlerts = alerts.filter((alert) => alert.deviceId === (device.id || device._id))
    const hasCritical = deviceAlerts.some((alert) => alert.severity === "critical")
    const hasWarning = deviceAlerts.some((alert) => alert.severity === "warning")

    let color = "#10B981" // green - normal
    if (!device.isActive) {
      color = "#6B7280" // gray - offline
    } else if (hasCritical) {
      color = "#EF4444" // red - critical
    } else if (hasWarning) {
      color = "#F59E0B" // yellow - warning
    }

    const displayType = reverseDeviceTypeMap[device.type] || device.type
    const iconText = displayType.charAt(0).toUpperCase()

    const iconHtml = `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        position: relative;
      ">
        ${iconText}
        ${!device.isActive ? '<div style="position: absolute; top: -2px; right: -2px; width: 10px; height: 10px; background: #EF4444; border-radius: 50%; border: 2px solid white;"></div>' : ""}
      </div>
    `

    return L.divIcon({
      html: iconHtml,
      className: "custom-device-marker",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    })
  }

  // Improved default map center and zoom
  // Using a more central world position for better global coverage
  const defaultPosition = [20.0, 0.0] // Slightly north of equator, central longitude
  const defaultZoom = 3

  // Calculate map bounds dynamically with improved zoom limits
  const getMapBounds = () => {
    if (devices.length === 0) {
      return { center: defaultPosition, zoom: defaultZoom }
    }

    if (devices.length === 1) {
      // Single device - center on it with good zoom level
      const device = devices[0]
      return {
        center: [device.gpsCoordinates.latitude, device.gpsCoordinates.longitude],
        zoom: 12, // Good zoom level for single device
      }
    }

    // Multiple devices - calculate bounds with adequate padding
    const latitudes = devices.map((d) => d.gpsCoordinates.latitude)
    const longitudes = devices.map((d) => d.gpsCoordinates.longitude)

    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)

    // Add reasonable padding to bounds
    const latPadding = Math.max((maxLat - minLat) * 0.15, 0.02) // At least 0.02 degrees padding
    const lngPadding = Math.max((maxLng - minLng) * 0.15, 0.02)

    return {
      bounds: [
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding],
      ],
    }
  }

  const mapBounds = getMapBounds()

  // Filter devices based on search and filters
  const filteredDevices = devices.filter((device) => {
    if (!device) return false

    const matchesSearch =
      (device.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.serialNumber || "").toLowerCase().includes(searchTerm.toLowerCase())

    const backendFilterType = filterType === "all" ? "all" : deviceTypeMap[filterType]
    const matchesType = filterType === "all" || device.type === backendFilterType

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && device.isActive) ||
      (filterStatus === "inactive" && !device.isActive)

    return matchesSearch && matchesType && matchesStatus
  })

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDevices().finally(() => {
      setRefreshing(false)
      setLastRefresh(new Date())
    })
  }

  // Get device status based on alerts
  const getDeviceStatus = (device) => {
    if (!device) return "offline"

    const deviceAlerts = alerts.filter((alert) => alert.deviceId === (device.id || device._id))

    if (!device.isActive) return "offline"
    if (deviceAlerts.some((alert) => alert.severity === "critical")) return "critical"
    if (deviceAlerts.some((alert) => alert.severity === "warning")) return "warning"
    return "normal"
  }

  // Calculate stats
  const stats = useMemo(() => {
    const validDevices = devices.filter((d) => d)
    const total = validDevices.length
    const online = validDevices.filter((d) => d.isActive).length
    const offline = total - online
    const critical = validDevices.filter((d) => getDeviceStatus(d) === "critical").length
    const warning = validDevices.filter((d) => getDeviceStatus(d) === "warning").length

    return { total, online, offline, critical, warning }
  }, [devices, alerts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading device locations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">Error Loading Map</p>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchDevices}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Device Locations</h1>
                    <p className="text-blue-100 dark:text-gray-300 text-lg">
                      Interactive OpenStreetMap showing all device locations
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex flex-col items-center justify-center text-center h-full">
                    <Wifi className="w-6 h-6 text-green-300 mb-2" />
                    <p className="text-sm font-medium text-green-200 mb-1">Online</p>
                    <p className="text-2xl font-bold text-white">{stats.online}</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex flex-col items-center justify-center text-center h-full">
                    <WifiOff className="w-6 h-6 text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-200 mb-1">Offline</p>
                    <p className="text-2xl font-bold text-white">{stats.offline}</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex flex-col items-center justify-center text-center h-full">
                    <AlertCircle className="w-6 h-6 text-red-300 mb-2" />
                    <p className="text-sm font-medium text-red-200 mb-1">Critical</p>
                    <p className="text-2xl font-bold text-white">{stats.critical}</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex flex-col items-center justify-center text-center h-full">
                    <AlertTriangle className="w-6 h-6 text-yellow-300 mb-2" />
                    <p className="text-sm font-medium text-yellow-200 mb-1">Warning</p>
                    <p className="text-2xl font-bold text-white">{stats.warning}</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex flex-col items-center justify-center text-center h-full">
                    <MapPin className="w-6 h-6 text-blue-300 mb-2" />
                    <p className="text-sm font-medium text-blue-200 mb-1">Total</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col space-y-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search devices, locations, serial numbers..."
                className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters and Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Type Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer min-w-[140px]"
                >
                  <option value="all">All Types</option>
                  {displayDeviceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* OSM Map Style Selector */}
              <select
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value)}
                className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer min-w-[140px]"
              >
                {Object.entries(osmTileLayerConfigs).map(([key, config]) => (
                  <option key={key} value={key}>
                    OSM {config.name}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-xl overflow-hidden">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">No devices found</p>
              <p className="text-gray-500 dark:text-gray-500">
                {devices.length === 0
                  ? "No devices available with location data"
                  : "Try adjusting your search or filter criteria"}
              </p>
            </div>
          ) : (
            <div className="h-[700px] w-full">
              <MapContainer
                center={mapBounds.center || defaultPosition}
                zoom={mapBounds.zoom || defaultZoom}
                bounds={mapBounds.bounds}
                boundsOptions={{ 
                  padding: [40, 40], 
                  maxZoom: 15 // Good max zoom for detailed view
                }}
                style={{ height: "100%", width: "100%" }}
                className="rounded-3xl"
                scrollWheelZoom={true}
                zoomControl={true}
                minZoom={2} // Prevent zooming out too far globally
                maxZoom={18} // Allow detailed zoom in
                key={`osm-map-${filteredDevices.length}-${mapStyle}`} // Force re-render when devices or style changes
              >
                <TileLayer 
                  url={osmTileLayerConfigs[mapStyle].url} 
                  attribution={osmTileLayerConfigs[mapStyle].attribution}
                  maxZoom={18}
                  subdomains={['a', 'b', 'c']}
                />

                {filteredDevices.map((device) => {
                  if (!device || !device.gpsCoordinates) return null

                  const deviceAlerts = alerts.filter((alert) => alert.deviceId === (device.id || device._id))
                  const status = getDeviceStatus(device)

                  return (
                    <Marker
                      key={device._id || device.id}
                      position={[device.gpsCoordinates.latitude, device.gpsCoordinates.longitude]}
                      icon={getDeviceIcon(device)}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                        <div className="text-center">
                          <div className="font-semibold text-sm">{device.name}</div>
                          <div className="text-xs text-gray-600">
                            {reverseDeviceTypeMap[device.type] || device.type}
                          </div>
                          {deviceAlerts.length > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              {deviceAlerts.length} alert{deviceAlerts.length > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </Tooltip>

                      <Popup maxWidth={380} className="custom-popup">
                        <div className="p-4">
                          <div className="flex items-center mb-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold mr-4 ${
                                status === "critical"
                                  ? "bg-red-500"
                                  : status === "warning"
                                    ? "bg-yellow-500"
                                    : status === "offline"
                                      ? "bg-gray-500"
                                      : "bg-green-500"
                              }`}
                            >
                              <HardDrive className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-800">{device.name}</h3>
                              <p className="text-sm text-gray-600">
                                {reverseDeviceTypeMap[device.type] || device.type}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 mb-4">
                            <div className="flex items-center text-sm">
                              <span className="font-semibold mr-2 min-w-[60px]">Serial:</span>
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                                {device.serialNumber}
                              </span>
                            </div>

                            <div className="flex items-start text-sm">
                              <MapPin className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                              <span>{device.location || "No location specified"}</span>
                            </div>

                            <div className="flex items-center text-sm">
                              <Navigation className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                              <span className="font-mono text-xs">
                                {device.gpsCoordinates.latitude.toFixed(6)},{" "}
                                {device.gpsCoordinates.longitude.toFixed(6)}
                              </span>
                            </div>

                            {device.assignedToUser && (
                              <div className="text-sm">
                                <span className="font-semibold">Assigned to:</span>{" "}
                                {device.assignedToUser.fullName || device.assignedToUser.username}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  device.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {device.isActive ? (
                                  <Wifi className="w-3 h-3 mr-1" />
                                ) : (
                                  <WifiOff className="w-3 h-3 mr-1" />
                                )}
                                {device.isActive ? "Online" : "Offline"}
                              </span>

                              {deviceAlerts.length > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {deviceAlerts.length} alert{deviceAlerts.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>

                            {/* Latest Sensor Readings */}
                            {device.data && Object.keys(device.data).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Latest Readings:</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(device.data)
                                    .slice(0, 4)
                                    .map(([param, value]) => (
                                      <div key={param} className="text-xs">
                                        <span className="text-gray-500 capitalize">{param.replace("_", " ")}:</span>
                                        <span className="font-medium ml-1">{value}</span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <Link
                            to={`/devices/${device._id}`}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {filteredDevices.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  Showing {filteredDevices.length} of {devices.length} devices on OpenStreetMap
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${refreshing ? "animate-spin" : ""}`} />
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

export default MapPage