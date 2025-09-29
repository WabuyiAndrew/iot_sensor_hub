import axios from "axios"
import {
  getTankShapeOptions,
  getSensorTypesRequiringOffset,
  validateTankDimensions,
} from "./tankShapeConfigs"

const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

const api = axios.create({
  baseURL: baseurl,
  timeout: 30000,
  withCredentials: true, // ✅ Send cookies automatically
  headers: {
    "Content-Type": "application/json",
  },
})

// --- Axios Request Interceptor ---
api.interceptors.request.use(
  (config) => {
    config.headers["x-request-id"] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log(`🔄 [API] Request: ${config.method?.toUpperCase()} ${config.url}`, {
      requestId: config.headers["x-request-id"],
    })
    return config
  },
  (error) => {
    console.error("❌ [API] Request interceptor error:", error)
    return Promise.reject(error)
  }
)

// --- Axios Response Interceptor ---
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      success: response.data?.success,
      requestId: response.config.headers["x-request-id"],
    })
    return response
  },
  (error) => {
    console.error("❌ [API] Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code,
      requestId: error.config?.headers["x-request-id"],
    })
    return Promise.reject(error)
  }
)


/**
 * Normalizes device data to handle different backend field structures
 * @param {object} device - Raw device data from API
 * @returns {object} Normalized device data
 */
const normalizeDeviceData = (device) => {
  if (!device) return null

  const tankType = device.tankType || device.assignedTank || device.tank || null
  const tankId = device.tankId || device.assignedTankId || device.tank?._id || null
  const tankName = device.tankName || device.assignedTankName || device.tank?.name || null

  return {
    ...device,
    tankType,
    tankId,
    tankName,
    isAssigned: !!(tankType || tankId || device.assignedTank || device.tank),
    _originalTankType: device.tankType,
    _originalAssignedTank: device.assignedTank,
    _originalTank: device.tank,
  }
}

/**
 * @param {object} tank - Raw tank data from API
 * @returns {object} Normalized tank data
 */
const normalizeTankData = (tank) => {
  if (!tank) return null

  return {
    ...tank,
    materialType: tank.materialType || tank.contentType || tank.material?.category || "liquid",
    currentVolumeLiters: tank.currentVolumeLiters || tank.currentVolume || tank.volume || 0,
    device: tank.device || tank.assignedDevice || tank.connectedDevice || null,
    devices: tank.devices || tank.assignedDevices || tank.connectedDevices || [],
    _originalContentType: tank.contentType,
    _originalDevice: tank.device,
    _originalDevices: tank.devices,
  }
}

export const tankApi = {
  getAllTanks: async (params = {}) => {
    try {
      console.log("🔄 [TankAPI] Fetching all tanks...", { params })
      const validatedParams = {
        ...params,
        limit: Math.min(Number(params.limit) || 50, 100),
        page: Math.max(Number(params.page) || 1, 1),
      }
      const response = await api.get("/api/tank-types", { params: validatedParams })

      if (response.data.success && Array.isArray(response.data.data)) {
        const normalizedTanks = response.data.data.map(normalizeTankData)
        console.log("✅ [TankAPI] Tanks fetched successfully:", {
          count: normalizedTanks.length,
          total: response.data.pagination?.totalCount,
          page: response.data.pagination?.currentPage,
        })
        return { ...response.data, data: normalizedTanks }
      } else {
        throw new Error("Invalid response format from server")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error fetching tanks:", error)
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in.")
      } else if (error.response?.status === 403) {
        throw new Error("You don't have permission to view tanks.")
      } else if (error.response?.status === 500) {
        throw new Error("Server error. Please try again later.")
      } else {
        throw new Error(error.response?.data?.message || "Failed to fetch tanks")
      }
    }
  },

  getTankById: async (id) => {
    try {
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid tank ID format")
      }
      console.log(`🔄 [TankAPI] Fetching tank by ID: ${id}`)
      const response = await api.get(`/api/tank-types/${id}`)
      if (response.data.success && response.data.data) {
        const normalizedTank = normalizeTankData(response.data.data)
        console.log("✅ [TankAPI] Tank fetched successfully:", {
          name: normalizedTank.name,
          materialType: normalizedTank.materialType,
          deviceCount: normalizedTank.devices?.length || 0,
        })
        return { ...response.data, data: normalizedTank }
      } else {
        throw new Error("Tank not found or invalid response")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error fetching tank:", error)
      if (error.response?.status === 404) {
        throw new Error("Tank not found")
      } else if (error.response?.status === 403) {
        throw new Error("You don't have permission to view this tank")
      } else if (error.response?.data?.message?.includes("Invalid tank ID")) {
        throw new Error("Invalid tank ID format")
      } else {
        throw new Error(error.response?.data?.message || "Failed to fetch tank details")
      }
    }
  },

  createTank: async (tankData) => {
    try {
      const validationErrors = validateTankData(tankData)
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`)
      }
      console.log("🔄 [TankAPI] Creating new tank:", {
        name: tankData.name,
        materialType: tankData.materialType,
        shape: tankData.shape,
      })
      const response = await api.post("/api/tank-types", tankData)
      if (response.data.success) {
        const normalizedTank = normalizeTankData(response.data.data)
        console.log("✅ [TankAPI] Tank created successfully:", {
          id: normalizedTank._id,
          name: normalizedTank.name,
        })
        return { ...response.data, data: normalizedTank }
      } else {
        throw new Error("Failed to create tank")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error creating tank:", error)
      if (error.response?.status === 400 && error.response?.data?.errors) {
        throw new Error(`Validation failed: ${error.response.data.errors.join(", ")}`)
      } else if (error.response?.data?.code === "INSUFFICIENT_PERMISSIONS") {
        throw new Error("You don't have permission to create tanks")
      } else {
        throw new Error(error.response?.data?.message || error.message || "Failed to create tank")
      }
    }
  },

  updateTank: async (id, tankData) => {
    try {
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid tank ID format")
      }

      const validationErrors = validateTankData(tankData, true)
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`)
      }

      const dataToSend = {
        name: tankData.name,
        shape: tankData.shape,
        orientation: tankData.orientation,
        location: tankData.location,
        materialType: tankData.materialType,
        capacity: tankData.capacity,
        dimensions: tankData.dimensions,
        device: tankData.device,
        alertThresholds: tankData.alertThresholds,
        deviceType: tankData.deviceType,
        offsetDepth: tankData.offsetDepth,
        bulkDensity: tankData.bulkDensity,
      }

      Object.keys(dataToSend).forEach((key) => {
        if (dataToSend[key] === undefined) {
          delete dataToSend[key]
        }
      })

      console.log(`🔄 [TankAPI] Updating tank: ${id}`, {
        name: dataToSend.name,
        hasChanges: Object.keys(dataToSend).length,
        dataToSend: dataToSend,
      })

      const response = await api.put(`/api/tank-types/${id}`, dataToSend)

      if (response.data.success) {
        const normalizedTank = normalizeTankData(response.data.data)
        console.log("✅ [TankAPI] Tank updated successfully:", {
          id: normalizedTank._id,
          name: normalizedTank.name,
        })
        return { ...response.data, data: normalizedTank }
      } else {
        throw new Error("Failed to update tank")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error updating tank:", error)
      console.error("❌ [TankAPI] Error response data:", error.response?.data)
      if (error.response?.status === 404) {
        throw new Error("Tank not found")
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || "Invalid data provided"
        throw new Error(`Validation error: ${errorMsg}`)
      } else if (error.response?.data?.code === "INSUFFICIENT_PERMISSIONS") {
        throw new Error("You don't have permission to update this tank")
      } else {
        throw new Error(error.response?.data?.message || error.message || "Failed to update tank")
      }
    }
  },

  deleteTank: async (id) => {
    try {
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid tank ID format")
      }
      console.log(`🔄 [TankAPI] Deleting tank: ${id}`)
      const response = await api.delete(`/api/tank-types/${id}`)
      if (response.data.success) {
        console.log("✅ [TankAPI] Tank deleted successfully:", { id })
        return response.data
      } else {
        throw new Error("Failed to delete tank")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error deleting tank:", error)
      if (error.response?.status === 404) {
        throw new Error("Tank not found")
      } else if (error.response?.data?.code === "INSUFFICIENT_PERMISSIONS") {
        throw new Error("You don't have permission to delete tanks")
      } else {
        throw new Error(error.response?.data?.message || "Failed to delete tank")
      }
    }
  },

  assignDevice: async (tankId, deviceId) => {
    try {
      console.log(`🔗 [TankAPI] Assigning device ${deviceId} to tank ${tankId}`)
      const response = await api.post(`/api/tank-types/${tankId}/devices`, {
        deviceId: deviceId,
      })
      if (response.data.success) {
        console.log("✅ [TankAPI] Device assigned successfully")
        return response.data
      } else {
        throw new Error("Failed to assign device")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error assigning device:", error)
      throw new Error(error.response?.data?.message || "Failed to assign device")
    }
  },

  unassignDevice: async (tankId, deviceId) => {
    try {
      console.log(`🔗 [TankAPI] Unassigning device ${deviceId} from tank ${tankId}`)
      const response = await api.delete(`/api/tank-types/${tankId}/devices/${deviceId}`)
      if (response.data.success) {
        console.log("✅ [TankAPI] Device unassigned successfully")
        return response.data
      } else {
        throw new Error("Failed to unassign device")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error unassigning device:", error)
      throw new Error(error.response?.data?.message || "Failed to unassign device")
    }
  },

  getUserTanks: async () => {
    try {
      console.log("🔄 [TankAPI] Fetching user's accessible tanks...")
      const response = await api.get("/api/tank-types/user/accessible")
      if (response.data.success && Array.isArray(response.data.data)) {
        const normalizedTanks = response.data.data.map(normalizeTankData)
        console.log("✅ [TankAPI] User tanks fetched successfully:", {
          count: normalizedTanks.length,
        })
        return { ...response.data, data: normalizedTanks }
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error fetching user tanks:", error)
      throw new Error(error.response?.data?.message || "Failed to fetch accessible tanks")
    }
  },

  checkTankAccess: async () => {
    try {
      console.log("🔄 [TankAPI] Checking tank access...")
      const response = await api.get("/api/tank-types/user/access-check")
      if (response.data.success) {
        console.log("✅ [TankAPI] Tank access checked:", {
          hasAccess: response.data.hasAccess,
          tankCount: response.data.accessibleTankCount,
        })
        return response.data
      } else {
        throw new Error("Failed to check access")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error checking tank access:", error)
      throw new Error(error.response?.data?.message || "Failed to check tank access")
    }
  },

  recordManualVolumeAdjustment: async (data) => {
    try {
      const response = await api.post("/api/volume-history", data)
      return response.data
    } catch (error) {
      console.error("Error recording manual volume adjustment:", error)
      return { success: false, message: error.response?.data?.message || error.message }
    }
  },

  getTankVolumeHistory: async (tankId, params) => {
    try {
      console.log("🔄 [TankAPI] Fetching volume history:", { tankId, params })

      let requestParams = {}
      const { timeRange, startDate, endDate, limit } = params

      // Handle custom date ranges (from MonthSelector)
      if (startDate && endDate) {
        requestParams = {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          period: "raw",
          limit: limit || 1000,
        }
      } else {
        // Handle predefined time ranges
        let calculatedStartDate, calculatedEndDate = new Date()
        
        switch (timeRange) {
          case "daily":
          case "24h":
            calculatedStartDate = new Date(calculatedEndDate.getTime() - 24 * 60 * 60 * 1000)
            break
          case "weekly":
          case "7d":
            calculatedStartDate = new Date(calculatedEndDate.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case "monthly":
          case "30d":
            calculatedStartDate = new Date(calculatedEndDate.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case "90d":
            calculatedStartDate = new Date(calculatedEndDate.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default:
            calculatedStartDate = new Date(calculatedEndDate.getTime() - 24 * 60 * 60 * 1000)
        }

        requestParams = {
          startDate: calculatedStartDate.toISOString(),
          endDate: calculatedEndDate.toISOString(),
          period: "raw",
          limit: limit || 1000,
        }
      }

      console.log("🔄 [TankAPI] Volume history request params:", requestParams)

      const response = await api.get(`/api/volume-history/${tankId}`, {
        params: requestParams,
      })

      console.log("✅ [TankAPI] Volume history response:", {
        success: response.data.success,
        dataLength: response.data.data?.length || 0,
      })

      return response.data
    } catch (error) {
      console.error("❌ [TankAPI] Error fetching tank volume history:", error)
      return { 
        success: false, 
        message: error.response?.data?.message || error.message,
        data: []
      }
    }
  },

  getTankVolumeStats: async (tankId, params) => {
    try {
      const { timeRange } = params
      const response = await api.get(`/api/volume-history/${tankId}/summary`, {
        params: { timeRange: timeRange },
      })
      return response.data
    } catch (error) {
      console.error("Error fetching tank volume stats:", error)
      return { success: false, message: error.response?.data?.message || error.message }
    }
  },
}

// --- Device API Functions ---
export const deviceApi = {
  getAllDevices: async (params = {}) => {
    try {
      console.log("🔄 [DeviceAPI] Fetching all devices with params:", params)
      const response = await api.get("/api/devices", { params })
      const devices = response.data.data || response.data.devices || []
      if (response.data.success && Array.isArray(devices)) {
        const normalizedDevices = devices.map((device) => {
          const normalized = normalizeDeviceData(device)
          normalized._isCurrentlyAssigned = normalized.isAssigned
          normalized._assignmentInfo = {
            tankId: normalized.tankId,
            tankName: normalized.tankName,
            isAssigned: normalized.isAssigned,
          }
          return normalized
        })
        console.log("✅ [DeviceAPI] Devices fetched successfully:", {
          total: normalizedDevices.length,
          assigned: normalizedDevices.filter((d) => d.isAssigned).length,
          unassigned: normalizedDevices.filter((d) => !d.isAssigned).length,
        })
        return {
          success: true,
          data: normalizedDevices,
          message: "Devices fetched successfully.",
        }
      } else {
        throw new Error("Invalid response format: Expected 'data' or 'devices' array.")
      }
    } catch (error) {
      console.error("❌ [DeviceAPI] Error fetching devices:", error)
      throw new Error(error.response?.data?.message || "Failed to fetch devices")
    }
  },

  getAvailableDevicesForTank: async (tankId = null) => {
    try {
      console.log(`🔄 [DeviceAPI] Fetching available devices for tank: ${tankId || "new tank"}`)
      const params = tankId ? { includeAssignedTo: tankId } : { tankType: "unassigned" }
      const result = await deviceApi.getAllDevices(params)
      if (result.success) {
        const devicesWithFlags = result.data.map((device) => ({
          ...device,
          _isCurrentlyAssigned: tankId && device.tankId === tankId,
          _isAvailableForAssignment: !device.isAssigned || (tankId && device.tankId === tankId),
        }))
        console.log("✅ [DeviceAPI] Available devices processed:", {
          total: devicesWithFlags.length,
          currentlyAssigned: devicesWithFlags.filter((d) => d._isCurrentlyAssigned).length,
          availableForAssignment: devicesWithFlags.filter((d) => d._isAvailableForAssignment).length,
        })
        return { ...result, data: devicesWithFlags }
      }
      return result
    } catch (error) {
      console.error("❌ [DeviceAPI] Error fetching available devices for tank:", error)
      throw new Error(error.response?.data?.message || "Failed to fetch available devices")
    }
  },

  getDeviceById: async (id) => {
    try {
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid device ID format")
      }
      console.log(`🔄 [DeviceAPI] Fetching device by ID: ${id}`)
      const response = await api.get(`/api/devices/${id}`)
      if (response.data.success && response.data.data) {
        const normalizedDevice = normalizeDeviceData(response.data.data)
        console.log("✅ [DeviceAPI] Device fetched successfully:", {
          name: normalizedDevice.name || normalizedDevice.serialNumber,
          isAssigned: normalizedDevice.isAssigned,
          tankId: normalizedDevice.tankId,
        })
        return { ...response.data, data: normalizedDevice }
      } else {
        throw new Error("Device not found or invalid response")
      }
    } catch (error) {
      console.error("❌ [DeviceAPI] Error fetching device:", error)
      if (error.response?.status === 404) {
        throw new Error("Device not found")
      } else {
        throw new Error(error.response?.data?.message || "Failed to fetch device details")
      }
    }
  },

  getTankCapableDevices: async () => {
    try {
      console.log("🔄 [DeviceAPI] Fetching tank-capable devices...")
      const response = await api.get("/api/devices/tank-capable")
      const devices = response.data.data || response.data.devices || []
      if (response.data.success && Array.isArray(devices)) {
        const normalizedDevices = devices.map(normalizeDeviceData)
        console.log("✅ [DeviceAPI] Tank-capable devices fetched successfully:", {
          total: normalizedDevices.length,
          assigned: normalizedDevices.filter((d) => d.isAssigned).length,
        })
        return {
          success: true,
          data: normalizedDevices,
          message: "Tank-capable devices fetched successfully.",
        }
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("❌ [DeviceAPI] Error fetching tank-capable devices:", error)
      throw new Error(error.response?.data?.message || "Failed to fetch tank-capable devices")
    }
  },
}

// --- REFACTORED Client-Side Validation Function ---
/**
 * @param {object} tankData - The tank data object to validate.
 * @param {boolean} [isUpdate=false] - Flag indicating if this is an update operation.
 * @returns {string[]} An array of error messages.
 */
function validateTankData(tankData, isUpdate = false) {
  const errors = []
  const deviceNeedsOffset = getSensorTypesRequiringOffset()
  const validTankShapes = getTankShapeOptions().map((s) => s.value)

  if (!isUpdate || tankData.name !== undefined) {
    if (!tankData.name || tankData.name.trim().length === 0) {
      errors.push("Tank name is required")
    } else if (tankData.name.length > 100) {
      errors.push("Tank name cannot exceed 100 characters")
    }
  }

  if (!isUpdate || tankData.materialType !== undefined) {
    if (!tankData.materialType || !["liquid", "solid", "gas", "mixed"].includes(tankData.materialType)) {
      errors.push("Valid material type is required")
    }
  }
  
  if (!isUpdate || tankData.shape !== undefined) {
    if (!tankData.shape || !validTankShapes.includes(tankData.shape)) {
      errors.push("Valid tank shape is required")
    }
  }

  if (!isUpdate || tankData.dimensions !== undefined) {
    if (!tankData.dimensions || typeof tankData.dimensions !== "object") {
      errors.push("Tank dimensions are required")
    } else {
      const dimensionErrors = validateTankDimensions(
        tankData.shape,
        tankData.dimensions,
        tankData.orientation,
      )
      errors.push(...dimensionErrors)
    }
  }

  if (!isUpdate || tankData.capacity !== undefined) {
    if (Number(tankData.capacity) <= 0 || isNaN(Number(tankData.capacity))) {
      errors.push("Valid total capacity is required")
    }
  }

  if (!isUpdate || tankData.alertThresholds !== undefined) {
    const { low, high, critical } = tankData.alertThresholds || {}
    if ((!isUpdate || low !== undefined) && (low === null || isNaN(Number(low)))) {
      errors.push("Low alert level is required and must be a number")
    }
    if ((!isUpdate || high !== undefined) && (high === null || isNaN(Number(high)))) {
      errors.push("High alert level is required and must be a number")
    }
    if ((!isUpdate || critical !== undefined) && (critical === null || isNaN(Number(critical)))) {
      errors.push("Critical alert level is required and must be a number")
    }
  }

  if (
    (!isUpdate || tankData.bulkDensity !== undefined) &&
    tankData.materialType === "solid"
  ) {
    if (Number(tankData.bulkDensity) <= 0 || isNaN(Number(tankData.bulkDensity))) {
      errors.push("Bulk density is required for solid materials and must be a positive number")
    }
  }

  if (!isUpdate || tankData.deviceType !== undefined) {
    if (!tankData.deviceType) {
      errors.push("Device type is required")
    } else if (getSensorTypesRequiringOffset().includes(tankData.deviceType)) {
      if (
        tankData.offsetDepth === undefined ||
        Number(tankData.offsetDepth) < 0 ||
        isNaN(Number(tankData.offsetDepth))
      ) {
        errors.push("Sensor offset is required for the selected device type and must be a non-negative number")
      }
    }
  }

  return errors
}






// REACT_APP_BASE_URL=https://api.2tume.com



// backend .env file
// PORT=5050
// MONGODB_URI=mongodb+srv://mukweliandy256:mukweli256@iotweb.zbrakwy.mongodb.net/taskm?retryWrites=true&w=majority&appName=iotweb
// TOKEN_KEY=1f8d716b0149fa7c773477363234819f3f616fa13bb3245876e1fd6c3b17139fde01d5be2dbfe2d35bb896a1208fa2bbe9228ad9dc78794e569d4a5c1aaf3a50
// CLIENT_URL=https://2tume.com # <-- IMPORTANT: Changed from localhost to your public domain