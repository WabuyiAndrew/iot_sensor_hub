"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { useCookies } from "react-cookie"
import moment from "moment"
import {
  PlusCircle,
  Edit,
  Trash2,
  XCircle,
  AlertCircle,
  Search,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  MapPin,
  Wifi,
  WifiOff,
  HardDrive,
  Eye,
  Smartphone,
  Globe,
  Users,
  Filter,
  Save,
  Loader,
  Settings,
} from "lucide-react"
import { Link, useOutletContext } from "react-router-dom"
import { toast } from "react-hot-toast"

const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

const deviceTypeMap = {
  "Air Quality": "air_quality",
  Weather: "WeatherS",
  Level1: "Level1",
  "Multi Sensor": "multi_sensor",
  Generic: "generic",
  "Temperature Humidity Sensor": "temperature_humidity_sensor",
  Ultrasonic: "Level2",
  "Radar Level Sensor": "radar_level_sensor",
  "Pressure Transmitter": "pressure_transmitter",
  "Submersible Level Sensor": "submersible_level_sensor",
  "Guided Wave Radar": "guided_wave_radar",
  "Laser Level Sensor": "laser_level_sensor",
  "Float Switch": "float_switch",
  "Capacitive Level Sensor": "capacitive_level_sensor",
  "Vibrating Fork": "vibrating_fork",
  "Load Cell": "load_cell",
}

const reverseDeviceTypeMap = Object.fromEntries(Object.entries(deviceTypeMap).map(([key, value]) => [value, key]))

// Status mapping helpers
const statusDisplayMap = {
  online: { label: "Online", color: "green", icon: Wifi },
  offline: { label: "Offline", color: "red", icon: WifiOff },
  maintenance: { label: "Maintenance", color: "yellow", icon: Settings },
}

// Helper function to normalize status values
const normalizeStatus = (status) => {
  if (!status) return "offline"
  
  const statusStr = status.toString().toLowerCase()
  
  // Map various status formats to our enum values
  switch (statusStr) {
    case "on":
    case "online":
    case "active":
    case "connected":
      return "online"
    case "off":
    case "offline":
    case "inactive":
    case "disconnected":
      return "offline"
    case "maintenance":
    case "repair":
    case "updating":
      return "maintenance"
    default:
      console.warn(`Unknown status value: ${status}, defaulting to offline`)
      return "offline"
  }
}

function DevicePage() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cookies] = useCookies(["token"])

  const { userRole } = useOutletContext()
  console.log("DevicePage: Current user role from context:", userRole)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentDevice, setCurrentDevice] = useState(null)
  const [formState, setFormState] = useState({
    name: "",
    serialNumber: "",
    type: "generic",
    status: "offline", // Ensure this matches schema enum
    location: "",
    gpsCoordinates: {
      latitude: "",
      longitude: "",
    },
    firmwareVersion: "1.0.0",
    batteryLevel: 100,
    assignedToUser: "",
    tankType: "",
    parameters: {},
    metadata: {},
    isActive: true,
    installationDate: new Date().toISOString().split("T")[0],
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deviceToDeleteId, setDeviceToDeleteId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const deviceTypes = [
    "air_quality",
    "WeatherS",
    "Level1",
    "multi_sensor",
    "generic",
    "temperature_humidity_sensor",
    "Level2",
    "radar_level_sensor",
    "pressure_transmitter",
    "submersible_level_sensor",
    "guided_wave_radar",
    "laser_level_sensor",
    "float_switch",
    "capacitive_level_sensor",
    "vibrating_fork",
    "load_cell",
  ]

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

  // const fetchDevices = useCallback(
  //   async (search = "", type = "all", status = "all", sortByField = "createdAt", sortOrderField = "desc") => {
  //     setLoading(true)
  //     setError(null)
  //     try {
  //       const response = await axios.get(`${baseurl}/api/devices`, {
  //         headers: {
  //           Authorization: `Bearer ${cookies.token}`,
  //         },
  //         params: {
  //           search,
  //           type: type !== "all" ? deviceTypeMap[type] || type : undefined,
  //           status: status !== "all" ? status : undefined,
  //           sortBy: sortByField,
  //           sortOrder: sortOrderField,
  //         },
  //       })
        
  //       // Normalize status values from backend
  //       const normalizedDevices = Array.isArray(response.data.data) 
  //         ? response.data.data.map(device => ({
  //             ...device,
  //             status: normalizeStatus(device.status)
  //           }))
  //         : []
        
  //       setDevices(normalizedDevices)
  //       if (!loading || search || type !== "all" || status !== "all") {
  //         toast.success(search ? "Devices filtered successfully!" : "Devices loaded successfully!")
  //       }
  //     } catch (err) {
  //       console.error("Error fetching devices:", err.response?.data || err.message)
  //       setError(
  //         err.response?.data?.message ||
  //           "Failed to load devices. Please ensure you are logged in and have permission, or check network.",
  //       )
  //       setDevices([])
  //       toast.error("Failed to load devices.")
  //     } finally {
  //       setLoading(false)
  //     }
  //   },
  //   [cookies.token],
  // )

  const fetchDevices = useCallback(
  async (search = "", type = "all", status = "all", sortByField = "createdAt", sortOrderField = "desc") => {
    setLoading(true);
    setError(null);

    // Determine the API endpoint based on the user's role
    const endpoint = userRole === "admin" ? `${baseurl}/api/devices` : `${baseurl}/api/devices/my-devices`;

    try {
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${cookies.token}`,
        },
        // The params object is only relevant for the 'admin' endpoint
        params: userRole === "admin" ? { 
          search,
          type: type !== "all" ? deviceTypeMap[type] || type : undefined,
          status: status !== "all" ? status : undefined,
          sortBy: sortByField,
          sortOrder: sortOrderField,
        } : {},
      });

      const normalizedDevices = Array.isArray(response.data.data) 
        ? response.data.data.map(device => ({
            ...device,
            status: normalizeStatus(device.status)
        }))
        : [];
      
      setDevices(normalizedDevices);
      toast.success(userRole === "admin" ? "All devices loaded successfully!" : "My devices loaded successfully!");
    } catch (err) {
      console.error("Error fetching devices:", err.response?.data || err.message);
      const errorMessage = userRole === "admin" 
        ? "Failed to load devices. Please ensure you have admin permission."
        : "Failed to load your devices. Please ensure you are logged in.";
      
      setError(errorMessage);
      setDevices([]);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  },
  [cookies.token, userRole] // Add userRole to the dependency array
);

  useEffect(() => {
    if (cookies.token) {
      fetchDevices(searchTerm, filterType, filterStatus, sortBy, sortOrder)
    } else {
      setError("You are not authenticated. Please log in to view devices.")
      setDevices([])
      setLoading(false)
    }
  }, [cookies.token, fetchDevices, searchTerm, filterType, filterStatus, sortBy, sortOrder])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    if (name === "latitude" || name === "longitude") {
      setFormState((prevState) => ({
        ...prevState,
        gpsCoordinates: {
          ...prevState.gpsCoordinates,
          [name]: value,
        },
      }))
    } else if (name === "batteryLevel") {
      setFormState((prevState) => ({
        ...prevState,
        [name]: Math.min(100, Math.max(0, Number.parseInt(value) || 0)),
      }))
    } else if (name === "status") {
      // Ensure status value is properly normalized
      const normalizedStatus = normalizeStatus(value)
      setFormState((prevState) => ({
        ...prevState,
        [name]: normalizedStatus,
      }))
    } else {
      setFormState((prevState) => ({
        ...prevState,
        [name]: type === "checkbox" ? checked : value,
      }))
    }
    setFormErrors((prev) => ({ ...prev, [name]: "" }))
  }, [])

  const validateForm = useCallback(() => {
    const errors = {}
    if (!formState.name?.trim()) errors.name = "Device Name is required."
    if (!formState.serialNumber?.trim()) errors.serialNumber = "Serial Number is required."
    if (!formState.type || !deviceTypes.includes(formState.type)) errors.type = "Device Type is required."

    // Validate status
    const validStatuses = ["online", "offline", "maintenance"]
    if (!validStatuses.includes(formState.status)) {
      errors.status = "Invalid status value. Must be online, offline, or maintenance."
    }

    const lat = formState.gpsCoordinates.latitude
    const lon = formState.gpsCoordinates.longitude

    if (lat !== "" || lon !== "") {
      const numLat = Number.parseFloat(lat)
      const numLon = Number.parseFloat(lon)

      if (isNaN(numLat) || numLat < -90 || numLat > 90) {
        errors.latitude = "Latitude must be a number between -90 and 90."
      }
      if (isNaN(numLon) || numLon < -180 || numLon > 180) {
        errors.longitude = "Longitude must be a number between -180 and 180."
      }
    }

    if (formState.batteryLevel < 0 || formState.batteryLevel > 100) {
      errors.batteryLevel = "Battery level must be between 0 and 100."
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formState, deviceTypes])

  const handleAddDevice = () => {
    setCurrentDevice(null)
    setFormState({
      name: "",
      serialNumber: "",
      type: "generic",
      status: "offline", // Ensure default status is valid
      location: "",
      gpsCoordinates: {
        latitude: "",
        longitude: "",
      },
      firmwareVersion: "1.0.0",
      batteryLevel: 100,
      assignedToUser: "",
      tankType: "",
      parameters: {},
      metadata: {},
      isActive: true,
      installationDate: new Date().toISOString().split("T")[0],
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleEditDevice = useCallback((device) => {
    setCurrentDevice(device)
    setFormState({
      name: device.name,
      serialNumber: device.serialNumber,
      type: device.type || "generic",
      status: normalizeStatus(device.status), // Normalize the status
      location: device.location || "",
      gpsCoordinates: {
        latitude:
          device.gpsCoordinates?.latitude !== undefined && device.gpsCoordinates.latitude !== null
            ? String(device.gpsCoordinates.latitude)
            : "",
        longitude:
          device.gpsCoordinates?.longitude !== undefined && device.gpsCoordinates.longitude !== null
            ? String(device.gpsCoordinates.longitude)
            : "",
      },
      firmwareVersion: device.firmwareVersion || "1.0.0",
      batteryLevel: device.batteryLevel || 100,
      assignedToUser: device.assignedToUser || "",
      tankType: device.tankType || "",
      parameters: device.parameters || {},
      metadata: device.metadata || {},
      isActive: device.isActive,
      installationDate: device.installationDate
        ? device.installationDate.split("T")[0]
        : new Date().toISOString().split("T")[0],
    })
    setFormErrors({})
    setIsModalOpen(true)
  }, [])

  const confirmDeleteDevice = useCallback((deviceId) => {
    setDeviceToDeleteId(deviceId)
    setIsDeleteConfirmOpen(true)
  }, [])

  const handleDeleteConfirmed = async () => {
    if (!deviceToDeleteId) return

    setIsDeleting(true)
    try {
      await axios.delete(`${baseurl}/api/devices/${deviceToDeleteId}`, {
        headers: {
          Authorization: `Bearer ${cookies.token}`,
        },
      })
      toast.success("Device deleted successfully!")
      fetchDevices(searchTerm, filterType, filterStatus, sortBy, sortOrder)
    } catch (err) {
      console.error("Error deleting device:", err.response?.data?.message || err.message)
      setError(err.response?.data?.message || "Failed to delete device. Please try again.")
      toast.error("Failed to delete device.")
    } finally {
      setIsDeleting(false)
      setIsDeleteConfirmOpen(false)
      setDeviceToDeleteId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting.")
      return
    }

    setIsSubmitting(true)

    const dataToSend = {
      name: formState.name,
      serialNumber: formState.serialNumber,
      type: formState.type,
      status: normalizeStatus(formState.status), // Ensure status is normalized before sending
      location: formState.location,
      gpsCoordinates: {
        latitude:
          formState.gpsCoordinates.latitude === "" ? undefined : Number.parseFloat(formState.gpsCoordinates.latitude),
        longitude:
          formState.gpsCoordinates.longitude === "" ? undefined : Number.parseFloat(formState.gpsCoordinates.longitude),
      },
      firmwareVersion: formState.firmwareVersion,
      batteryLevel: formState.batteryLevel,
      assignedToUser: formState.assignedToUser || null,
      tankType: formState.tankType || null,
      parameters: formState.parameters,
      metadata: formState.metadata,
      isActive: formState.isActive,
      installationDate: formState.installationDate,
    }

    console.log("DevicePage: Data being sent to API:", dataToSend)
    console.log("DevicePage: Status value being sent:", dataToSend.status)

    try {
      if (currentDevice) {
        await axios.put(`${baseurl}/api/devices/${currentDevice._id}`, dataToSend, {
          headers: {
            Authorization: `Bearer ${cookies.token}`,
          },
        })
        toast.success(`Device "${dataToSend.name}" updated successfully!`)
      } else {
        await axios.post(`${baseurl}/api/devices`, dataToSend, {
          headers: {
            Authorization: `Bearer ${cookies.token}`,
          },
        })
        toast.success(`Device "${dataToSend.name}" added successfully!`)
      }
      setIsModalOpen(false)
      fetchDevices(searchTerm, filterType, filterStatus, sortBy, sortOrder)
    } catch (err) {
      console.error("Error saving device:", err.response?.data || err.message)
      const backendErrorMessage =
        err.response?.data?.message || err.response?.data?.msg || "Failed to save device. Check inputs and try again."
      setError(backendErrorMessage)
      toast.error(backendErrorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchAnalyticsForDevice = useCallback(
    async (device) => {
      if (!device?.serialNumber || !cookies.token) return null

      try {
        // Use the correct endpoint with query parameters
        const response = await axios.get(`${baseurl}/api/sensor/analytic-data`, {
          headers: { Authorization: `Bearer ${cookies.token}` },
          params: {
            deviceType: device.type || "unknown",
            deviceNumber: device.serialNumber, // Changed from deviceNumber to deviceNo
            period: "daily",
            startDate: moment().subtract(1, "day").format("YYYY-MM-DD"),
          },
        })

        if (response.data.success && response.data.data) {
          return response.data.data
        }
      } catch (error) {
        console.error(`Error fetching analytics for device ${device.serialNumber}:`, error)
      }
      return null
    },
    [baseurl, cookies.token],
  )

  const filteredAndSortedDevices = (Array.isArray(devices) ? devices : [])
    .filter((device) => {
      if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase()
        if (
          !(
            device.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
            device.serialNumber?.toLowerCase().includes(lowerCaseSearchTerm) ||
            device.location?.toLowerCase().includes(lowerCaseSearchTerm)
          )
        ) {
          return false
        }
      }
      if (filterType !== "all") {
        const backendFilterType = deviceTypeMap[filterType]
        if (device.type !== backendFilterType) return false
      }
      if (filterStatus !== "all") {
        if (filterStatus === "active" && !device.isActive) return false
        if (filterStatus === "inactive" && device.isActive) return false
      }
      return true
    })
    .sort((a, b) => {
      const aValue = a[sortBy] || ""
      const bValue = b[sortBy] || ""
      const comparison = aValue.toString().localeCompare(bValue.toString())
      return sortOrder === "asc" ? comparison : -comparison
    })

  // Helper function to get status display info
  const getStatusDisplay = (device) => {
    const status = normalizeStatus(device.status)
    const statusInfo = statusDisplayMap[status] || statusDisplayMap.offline
    const IconComponent = statusInfo.icon
    
    return {
      status,
      label: statusInfo.label,
      color: statusInfo.color,
      icon: IconComponent,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading devices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-slate-900/50 dark:to-indigo-950/30 backdrop-blur-xl rounded-2xl shadow-xl min-h-[calc(100vh-120px)]">
      {/* Enhanced Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center mb-4 sm:mb-6">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl mr-3 sm:mr-4 shadow-lg">
            <HardDrive className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
              IoT Devices
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Manage your connected devices and sensors
            </p>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          {/* Top Row - Search and Main Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search devices..."
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 transition-all duration-200 text-sm sm:text-base"
                value={searchTerm}
                onChange={handleSearchChange}
                aria-label="Search devices"
              />
            </div>

            {/* Filter Toggle and Add Button */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 text-sm sm:text-base ${
                  showFilters
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-white/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              {userRole === "admin" && (
                <button
                  onClick={handleAddDevice}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                >
                  <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add Device</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters Row - Collapsible */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="all">All Types</option>
                {deviceTypes.map((type) => (
                  <option key={type} value={type}>
                    {reverseDeviceTypeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="location">Location</option>
                <option value="serialNumber">Serial</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                {sortOrder === "asc" ? (
                  <SortAsc className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <SortDesc className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-xl p-1 ml-auto">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-gray-600 shadow-sm"
                      : "hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    viewMode === "list"
                      ? "bg-white dark:bg-gray-600 shadow-sm"
                      : "hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <List className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl mb-4 sm:mb-6 flex items-center shadow-lg">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-3 flex-shrink-0" />
          <span className="text-sm sm:text-base">{error}</span>
        </div>
      )}

      {/* Devices Display */}
      {filteredAndSortedDevices.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
            {filteredAndSortedDevices.map((device) => {
              const statusDisplay = getStatusDisplay(device)
              const StatusIcon = statusDisplay.icon
              
              return (
                <div
                  key={device._id}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col h-full min-h-[280px] sm:min-h-[320px]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                        <HardDrive className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 truncate">
                          {device.name}
                        </h3>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {reverseDeviceTypeMap[device.type] || device.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center flex-shrink-0 ml-2">
                      <StatusIcon className={`w-4 h-4 sm:w-5 sm:h-5 text-${statusDisplay.color}-500`} />
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3 flex-grow">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold mr-2">Serial:</span>
                      <span className="font-mono text-xs bg-gray-100/70 dark:bg-gray-700/70 backdrop-blur-sm px-2 py-1 rounded truncate">
                        {device.serialNumber}
                      </span>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{device.location || "No location"}</span>
                    </div>
                    {device.gpsCoordinates?.latitude !== undefined && device.gpsCoordinates?.longitude !== undefined && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center">
                        <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">
                          GPS: {device.gpsCoordinates.latitude.toFixed(4)}, {device.gpsCoordinates.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {device.assignedToUser && (
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="font-semibold mr-1">Assigned to:</span>
                        <span className="truncate">
                          {device.assignedToUser.fullName || device.assignedToUser.username || "N/A"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <span
                        className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                          statusDisplay.color === 'green'
                            ? "bg-green-100/70 text-green-800 dark:bg-green-900/30 dark:text-green-400 backdrop-blur-sm"
                            : statusDisplay.color === 'yellow'
                            ? "bg-yellow-100/70 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 backdrop-blur-sm"
                            : "bg-red-100/70 text-red-800 dark:bg-red-900/30 dark:text-red-400 backdrop-blur-sm"
                        }`}
                      >
                        {statusDisplay.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1 sm:gap-2 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
                    <Link
                      to={`/devices/${device._id}`}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">View</span>
                    </Link>
                    {userRole === "admin" && (
                      <>
                        <button
                          onClick={() => handleEditDevice(device)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
                          aria-label={`Edit ${device.name}`}
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">Edit</span>
                        </button>
                        <button
                          onClick={() => confirmDeleteDevice(device._id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
                          aria-label={`Delete ${device.name}`}
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">Del</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/70 dark:bg-gray-700/50 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Device
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Location
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Assigned
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {filteredAndSortedDevices.map((device) => {
                    const statusDisplay = getStatusDisplay(device)
                    const StatusIcon = statusDisplay.icon
                    
                    return (
                      <tr
                        key={device._id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200"
                      >
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white shadow-lg flex-shrink-0">
                              <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="ml-3 min-w-0">
                              <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                                {device.name}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                                {device.serialNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                          {reverseDeviceTypeMap[device.type] || device.type}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                          {device.location || "N/A"}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                              statusDisplay.color === 'green'
                                ? "bg-green-100/70 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : statusDisplay.color === 'yellow'
                                ? "bg-yellow-100/70 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100/70 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusDisplay.label}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                          {device.assignedToUser
                            ? device.assignedToUser.fullName || device.assignedToUser.username
                            : "Unassigned"}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="flex gap-1 sm:gap-2">
                            <Link
                              to={`/devices/${device._id}`}
                              className="p-1 sm:p-2 text-blue-600 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Link>
                            {userRole === "admin" && (
                              <>
                                <button
                                  onClick={() => handleEditDevice(device)}
                                  className="p-1 sm:p-2 text-indigo-600 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors duration-200"
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={() => confirmDeleteDevice(device._id)}
                                  className="p-1 sm:p-2 text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12 sm:py-16">
          <HardDrive className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg sm:text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
            {searchTerm ? "No devices found matching your search" : "No devices available"}
          </p>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
            {searchTerm ? "Try adjusting your search criteria" : "Add your first device to get started"}
          </p>
        </div>
      )}

      {/* Enhanced Add/Edit Device Modal */}
      {isModalOpen && userRole === "admin" && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/60 to-indigo-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 sm:p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-white/20 rounded-xl mr-3">
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">
                      {currentDevice ? "✏️ Edit Device" : "📱 Add New Device"}
                    </h2>
                    <p className="text-orange-100 mt-1 text-sm sm:text-base">
                      {currentDevice ? "Update device information and settings" : "Register a new IoT device"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
                  aria-label="Close modal"
                >
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Device Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Device Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formState.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200`}
                    placeholder="e.g., Office Air Quality Monitor"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                </div>

                {/* Serial Number */}
                <div>
                  <label
                    htmlFor="serialNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="serialNumber"
                    id="serialNumber"
                    value={formState.serialNumber}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.serialNumber ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200 font-mono`}
                    placeholder="e.g., AQ001-2024-001"
                  />
                  {formErrors.serialNumber && <p className="text-red-500 text-sm mt-1">{formErrors.serialNumber}</p>}
                </div>

                {/* Device Type */}
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Device Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    id="type"
                    value={formState.type}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.type ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200`}
                  >
                    {deviceTypes.map((type) => (
                      <option key={type} value={type}>
                        {reverseDeviceTypeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  {formErrors.type && <p className="text-red-500 text-sm mt-1">{formErrors.type}</p>}
                </div>

                {/* Status - Updated with proper validation */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    id="status"
                    value={formState.status}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.status ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200`}
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  {formErrors.status && <p className="text-red-500 text-sm mt-1">{formErrors.status}</p>}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Device operational status (online, offline, or maintenance)
                  </p>
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={formState.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200"
                    placeholder="e.g., Building A, Floor 2, Room 201"
                  />
                </div>

                {/* GPS Coordinates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GPS Coordinates (Optional)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="latitude" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Latitude (-90 to 90)
                      </label>
                      <input
                        type="number"
                        name="latitude"
                        id="latitude"
                        step="any"
                        min="-90"
                        max="90"
                        value={formState.gpsCoordinates.latitude}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          formErrors.latitude ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                        } bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200`}
                        placeholder="e.g., 40.7128"
                      />
                      {formErrors.latitude && <p className="text-red-500 text-xs mt-1">{formErrors.latitude}</p>}
                    </div>
                    <div>
                      <label htmlFor="longitude" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Longitude (-180 to 180)
                      </label>
                      <input
                        type="number"
                        name="longitude"
                        id="longitude"
                        step="any"
                        min="-180"
                        max="180"
                        value={formState.gpsCoordinates.longitude}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          formErrors.longitude ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                        } bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200`}
                        placeholder="e.g., -74.0060"
                      />
                      {formErrors.longitude && <p className="text-red-500 text-xs mt-1">{formErrors.longitude}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="firmwareVersion"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Firmware Version
                  </label>
                  <input
                    type="text"
                    name="firmwareVersion"
                    id="firmwareVersion"
                    value={formState.firmwareVersion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200 font-mono"
                    placeholder="e.g., 1.0.0"
                  />
                </div>

                <div>
                  <label
                    htmlFor="batteryLevel"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Battery Level (%)
                  </label>
                  <input
                    type="number"
                    name="batteryLevel"
                    id="batteryLevel"
                    min="0"
                    max="100"
                    value={formState.batteryLevel}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.batteryLevel ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200`}
                    placeholder="100"
                  />
                  {formErrors.batteryLevel && <p className="text-red-500 text-sm mt-1">{formErrors.batteryLevel}</p>}
                </div>

                <div>
                  <label
                    htmlFor="installationDate"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Installation Date
                  </label>
                  <input
                    type="date"
                    name="installationDate"
                    id="installationDate"
                    value={formState.installationDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formState.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Device is Active
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    (This is different from status - controls whether the device is enabled in the system)
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 p-4 sm:p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 bg-gray-200/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    {currentDevice ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {currentDevice ? "Update Device" : "Add Device"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-100/70 dark:bg-red-900/30 backdrop-blur-sm rounded-full mr-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this device? This action cannot be undone and will remove all associated
              data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-200/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Deleting...
                  </>
                ) : (
                  "Delete Device"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DevicePage