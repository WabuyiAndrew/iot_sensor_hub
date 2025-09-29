// import axios from "axios"

// // Use your existing base URL logic
// const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

// // Create axios instance that works with your existing AuthContext
// const api = axios.create({
//   baseURL: baseurl,
//   timeout: 30000,
//   headers: {
//     "Content-Type": "application/json",
//   },
// })

// // Enhanced request interceptor that works with your cookie-based auth
// api.interceptors.request.use(
//   (config) => {
//     // Get token from cookies (matching your AuthContext approach)
//     const token = document.cookie
//       .split("; ")
//       .find((row) => row.startsWith("token="))
//       ?.split("=")[1]

//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`
//     }

//     // Add request ID for debugging (matching your backend middleware)
//     config.headers["x-request-id"] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

//     console.log(`🔄 [API] Request: ${config.method?.toUpperCase()} ${config.url}`, {
//       hasToken: !!token,
//       requestId: config.headers["x-request-id"],
//     })

//     return config
//   },
//   (error) => {
//     console.error("❌ [API] Request interceptor error:", error)
//     return Promise.reject(error)
//   },
// )

// // Response interceptor that works with your AuthContext's axios interceptor
// api.interceptors.response.use(
//   (response) => {
//     console.log(`✅ [API] Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
//       status: response.status,
//       success: response.data?.success,
//       requestId: response.config.headers["x-request-id"],
//     })
//     return response
//   },
//   (error) => {
//     console.error("❌ [API] Error:", {
//       url: error.config?.url,
//       method: error.config?.method,
//       status: error.response?.status,
//       message: error.response?.data?.message || error.message,
//       code: error.response?.data?.code,
//       requestId: error.config?.headers["x-request-id"],
//     })

//     // Let your AuthContext interceptor handle auth errors
//     // This interceptor focuses on API-specific error handling
//     return Promise.reject(error)
//   },
// )

// // Enhanced Tank API functions with better error handling and validation
// export const tankApi = {
//   // Get all tanks with enhanced error handling
//   getAllTanks: async (params = {}) => {
//     try {
//       console.log("🔄 [TankAPI] Fetching all tanks...", { params })

//       // Validate params
//       const validatedParams = {
//         ...params,
//         limit: Math.min(Number(params.limit) || 50, 100), // Cap at 100
//         page: Math.max(Number(params.page) || 1, 1), // Min page 1
//       }

//       const response = await api.get("/api/tank-types", { params: validatedParams })

//       if (response.data.success && Array.isArray(response.data.data)) {
//         console.log("✅ [TankAPI] Tanks fetched successfully:", {
//           count: response.data.data.length,
//           total: response.data.pagination?.totalCount,
//           page: response.data.pagination?.currentPage,
//         })
//         return response.data
//       } else {
//         throw new Error("Invalid response format from server")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error fetching tanks:", error)

//       // Enhanced error handling based on your backend error codes
//       if (error.response?.status === 401) {
//         throw new Error("Authentication required. Please log in.")
//       } else if (error.response?.status === 403) {
//         throw new Error("You don't have permission to view tanks.")
//       } else if (error.response?.status === 500) {
//         throw new Error("Server error. Please try again later.")
//       } else {
//         throw new Error(error.response?.data?.message || "Failed to fetch tanks")
//       }
//     }
//   },

//   // Get tank by ID with enhanced validation and error handling
//   getTankById: async (id) => {
//     try {
//       // Validate MongoDB ObjectId format
//       if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
//         throw new Error("Invalid tank ID format")
//       }

//       console.log(`🔄 [TankAPI] Fetching tank by ID: ${id}`)
//       const response = await api.get(`/api/tank-types/${id}`)

//       if (response.data.success && response.data.data) {
//         console.log("✅ [TankAPI] Tank fetched successfully:", {
//           name: response.data.data.name,
//           type: response.data.data.type || response.data.data.contentType,
//           deviceCount: response.data.data.devices?.length || 0,
//         })
//         return response.data
//       } else {
//         throw new Error("Tank not found or invalid response")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error fetching tank:", error)

//       // Handle specific backend error codes
//       if (error.response?.status === 404) {
//         throw new Error("Tank not found")
//       } else if (error.response?.status === 403) {
//         throw new Error("You don't have permission to view this tank")
//       } else if (error.response?.data?.message?.includes("Invalid tank ID")) {
//         throw new Error("Invalid tank ID format")
//       } else if (error.message.includes("System is currently experiencing")) {
//         // Remove this system health check
//         throw new Error(error.response?.data?.message || "Failed to fetch tank details")
//       } else {
//         throw new Error(error.response?.data?.message || "Failed to fetch tank details")
//       }
//     }
//   },

//   // Create tank with comprehensive validation
//   createTank: async (tankData) => {
//     try {
//       // Client-side validation
//       const validationErrors = validateTankData(tankData)
//       if (validationErrors.length > 0) {
//         throw new Error(`Validation failed: ${validationErrors.join(", ")}`)
//       }

//       console.log("🔄 [TankAPI] Creating new tank:", {
//         name: tankData.name,
//         type: tankData.type,
//         shape: tankData.shape,
//       })

//       const response = await api.post("/api/tank-types", tankData)

//       if (response.data.success) {
//         console.log("✅ [TankAPI] Tank created successfully:", {
//           id: response.data.data?._id,
//           name: response.data.data?.name,
//         })
//         return response.data
//       } else {
//         throw new Error("Failed to create tank")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error creating tank:", error)

//       // Handle validation errors from backend
//       if (error.response?.status === 400 && error.response?.data?.errors) {
//         throw new Error(`Validation failed: ${error.response.data.errors.join(", ")}`)
//       } else if (error.response?.data?.code === "INSUFFICIENT_PERMISSIONS") {
//         throw new Error("You don't have permission to create tanks")
//       } else {
//         throw new Error(error.response?.data?.message || error.message || "Failed to create tank")
//       }
//     }
//   },

//   // Update tank with validation
//   updateTank: async (id, tankData) => {
//     try {
//       if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
//         throw new Error("Invalid tank ID format")
//       }

//       // Client-side validation for updates
//       const validationErrors = validateTankData(tankData, true) // true for update mode
//       if (validationErrors.length > 0) {
//         throw new Error(`Validation failed: ${validationErrors.join(", ")}`)
//       }

//       // Clean the data before sending - remove any fields that might cause issues
//       const cleanedData = {
//         name: tankData.name?.trim(),
//         description: tankData.description?.trim() || "",
//         shape: tankData.shape,
//         material: tankData.material,
//         contentType: tankData.contentType,
//         type: tankData.contentType, // Backend compatibility
//         materialType: tankData.contentType, // Backend compatibility
//         dimensions: {
//           height: Number(tankData.dimensions.height),
//           unit: tankData.dimensions.unit,
//           ...(tankData.dimensions.diameter && { diameter: Number(tankData.dimensions.diameter) }),
//           ...(tankData.dimensions.length && { length: Number(tankData.dimensions.length) }),
//           ...(tankData.dimensions.width && { width: Number(tankData.dimensions.width) }),
//         },
//         totalCapacityLiters: Number(tankData.totalCapacityLiters),
//         defaultDepth: Number(tankData.defaultDepth),
//         capacity: {
//           total: Number(tankData.capacity?.total || tankData.totalCapacityLiters),
//           unit: tankData.capacity?.unit || "L",
//         },
//         location: tankData.location,
//         devices: tankData.devices || [],
//         status: tankData.status || "active",
//         tags: tankData.tags || [],
//         alertThresholds: tankData.alertThresholds || [],
//       }

//       // Remove undefined values
//       Object.keys(cleanedData).forEach((key) => {
//         if (cleanedData[key] === undefined || cleanedData[key] === null) {
//           delete cleanedData[key]
//         }
//       })

//       console.log(`🔄 [TankAPI] Updating tank: ${id}`, {
//         name: cleanedData.name,
//         hasChanges: Object.keys(cleanedData).length,
//         cleanedData: cleanedData, // Log cleaned data to debug
//       })

//       const response = await api.put(`/api/tank-types/${id}`, cleanedData)

//       if (response.data.success) {
//         console.log("✅ [TankAPI] Tank updated successfully:", {
//           id: response.data.data?._id,
//           name: response.data.data?.name,
//         })
//         return response.data
//       } else {
//         throw new Error("Failed to update tank")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error updating tank:", error)
//       console.error("❌ [TankAPI] Error response data:", error.response?.data)
//       console.error("❌ [TankAPI] Full error:", error)

//       if (error.response?.status === 404) {
//         throw new Error("Tank not found")
//       } else if (error.response?.status === 400) {
//         const errorMsg = error.response?.data?.message || error.response?.data?.error || "Invalid data provided"
//         throw new Error(`Validation error: ${errorMsg}`)
//       } else if (error.response?.data?.code === "INSUFFICIENT_PERMISSIONS") {
//         throw new Error("You don't have permission to update this tank")
//       } else {
//         throw new Error(error.response?.data?.message || error.message || "Failed to update tank")
//       }
//     }
//   },

//   // Delete tank with confirmation
//   deleteTank: async (id) => {
//     try {
//       if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
//         throw new Error("Invalid tank ID format")
//       }

//       console.log(`🔄 [TankAPI] Deleting tank: ${id}`)
//       const response = await api.delete(`/api/tank-types/${id}`)

//       if (response.data.success) {
//         console.log("✅ [TankAPI] Tank deleted successfully:", { id })
//         return response.data
//       } else {
//         throw new Error("Failed to delete tank")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error deleting tank:", error)

//       if (error.response?.status === 404) {
//         throw new Error("Tank not found")
//       } else if (error.response?.data?.code === "INSUFFICIENT_PERMISSIONS") {
//         throw new Error("You don't have permission to delete tanks")
//       } else {
//         throw new Error(error.response?.data?.message || "Failed to delete tank")
//       }
//     }
//   },

//   // Assign device to tank
//   assignDevice: async (tankId, deviceId) => {
//     try {
//       console.log(`🔗 [TankAPI] Assigning device ${deviceId} to tank ${tankId}`)

//       const response = await api.post(`/api/tank-types/${tankId}/devices`, {
//         deviceId: deviceId,
//       })

//       if (response.data.success) {
//         console.log("✅ [TankAPI] Device assigned successfully")
//         return response.data
//       } else {
//         throw new Error("Failed to assign device")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error assigning device:", error)
//       throw new Error(error.response?.data?.message || "Failed to assign device")
//     }
//   },

//   // Unassign device from tank
//   unassignDevice: async (tankId, deviceId) => {
//     try {
//       console.log(`🔗 [TankAPI] Unassigning device ${deviceId} from tank ${tankId}`)

//       const response = await api.delete(`/api/tank-types/${tankId}/devices/${deviceId}`)

//       if (response.data.success) {
//         console.log("✅ [TankAPI] Device unassigned successfully")
//         return response.data
//       } else {
//         throw new Error("Failed to unassign device")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error unassigning device:", error)
//       throw new Error(error.response?.data?.message || "Failed to unassign device")
//     }
//   },

//   // Get user's accessible tanks
//   getUserTanks: async () => {
//     try {
//       console.log("🔄 [TankAPI] Fetching user's accessible tanks...")
//       const response = await api.get("/api/tank-types/user/accessible")

//       if (response.data.success && Array.isArray(response.data.data)) {
//         console.log("✅ [TankAPI] User tanks fetched successfully:", {
//           count: response.data.data.length,
//         })
//         return response.data
//       } else {
//         throw new Error("Invalid response format")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error fetching user tanks:", error)
//       throw new Error(error.response?.data?.message || "Failed to fetch accessible tanks")
//     }
//   },

//   // Check tank access
//   checkTankAccess: async () => {
//     try {
//       console.log("🔄 [TankAPI] Checking tank access...")
//       const response = await api.get("/api/tank-types/user/access-check")

//       if (response.data.success) {
//         console.log("✅ [TankAPI] Tank access checked:", {
//           hasAccess: response.data.hasAccess,
//           tankCount: response.data.accessibleTankCount,
//         })
//         return response.data
//       } else {
//         throw new Error("Failed to check access")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error checking tank access:", error)
//       throw new Error(error.response?.data?.message || "Failed to check tank access")
//     }
//   },

//   // Get available devices for tank assignment
//   getAvailableDevices: async () => {
//     try {
//       console.log("🔄 [TankAPI] Fetching available devices for assignment...")
//       // Use the correct endpoint that exists in your backend
//       const response = await api.get("/api/devices")

//       if (response.data.success && Array.isArray(response.data.data)) {
//         console.log("✅ [TankAPI] Available devices fetched successfully:", response.data.data.length)
//         return response.data
//       } else {
//         throw new Error("Invalid response format")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error fetching available devices:", error)
//       throw new Error(error.response?.data?.message || "Failed to fetch available devices")
//     }
//   },

//   // Get user's accessible tanks (for non-admin users)
//   getUserAccessibleTanks: async () => {
//     try {
//       console.log("🔄 [TankAPI] Fetching user's accessible tanks...")
//       const response = await api.get("/api/tank-types/user/accessible")

//       if (response.data.success && Array.isArray(response.data.data)) {
//         console.log("✅ [TankAPI] User accessible tanks fetched successfully:", response.data.data.length)
//         return response.data
//       } else {
//         throw new Error("Invalid response format")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error fetching user accessible tanks:", error)
//       throw new Error(error.response?.data?.message || "Failed to fetch accessible tanks")
//     }
//   },

//   // Add a new function to get available devices including assigned ones for editing:
//   getAvailableDevicesForEdit: async (tankId = null) => {
//     try {
//       console.log("🔄 [TankAPI] Fetching available devices for editing...")
//       const response = await api.get("/api/devices", {
//         params: { includeAssigned: tankId ? true : false, tankId },
//       })

//       if (response.data.success && Array.isArray(response.data.data)) {
//         console.log("✅ [TankAPI] Available devices fetched successfully:", response.data.data.length)
//         return response.data
//       } else {
//         throw new Error("Invalid response format")
//       }
//     } catch (error) {
//       console.error("❌ [TankAPI] Error fetching available devices:", error)
//       throw new Error(error.response?.data?.message || "Failed to fetch available devices")
//     }
//   },
// }

// // Device API functions (enhanced to work with your auth system)
// export const deviceApi = {
//   getAllDevices: async (params = {}) => {
//     try {
//       console.log("🔄 [DeviceAPI] Fetching all devices...")
//       const response = await api.get("/api/devices", { params })

//       if (response.data.success && Array.isArray(response.data.data)) {
//         console.log("✅ [DeviceAPI] Devices fetched successfully:", response.data.data.length, "devices")
//         return response.data
//       } else {
//         throw new Error("Invalid response format")
//       }
//     } catch (error) {
//       console.error("❌ [DeviceAPI] Error fetching devices:", error)
//       throw new Error(error.response?.data?.message || "Failed to fetch devices")
//     }
//   },

//   getTankCapableDevices: async () => {
//     try {
//       console.log("🔄 [DeviceAPI] Fetching tank-capable devices...")
//       const response = await api.get("/api/devices/tank-capable")

//       if (response.data.success) {
//         console.log(
//           "✅ [DeviceAPI] Tank-capable devices fetched successfully:",
//           response.data.devices?.length || 0,
//           "devices",
//         )
//         return response.data
//       } else {
//         throw new Error("Invalid response format")
//       }
//     } catch (error) {
//       console.error("❌ [DeviceAPI] Error fetching tank-capable devices:", error)
//       throw new Error(error.response?.data?.message || "Failed to fetch tank-capable devices")
//     }
//   },
// }

// // Client-side validation function
// function validateTankData(tankData, isUpdate = false) {
//   const errors = []

//   if (!isUpdate || tankData.name !== undefined) {
//     if (!tankData.name || tankData.name.trim().length === 0) {
//       errors.push("Tank name is required")
//     } else if (tankData.name.length > 100) {
//       errors.push("Tank name cannot exceed 100 characters")
//     }
//   }

//   // Fix: Check contentType instead of type
//   if (!isUpdate || tankData.contentType !== undefined) {
//     if (!tankData.contentType || !["liquid", "solid", "gas", "mixed"].includes(tankData.contentType)) {
//       errors.push("Valid content type is required")
//     }
//   }

//   if (!isUpdate || tankData.shape !== undefined) {
//     if (!tankData.shape || !["cylindrical", "rectangular", "spherical", "conical"].includes(tankData.shape)) {
//       errors.push("Valid tank shape is required")
//     }
//   }

//   if (!isUpdate || tankData.dimensions !== undefined) {
//     if (!tankData.dimensions || typeof tankData.dimensions !== "object") {
//       errors.push("Tank dimensions are required")
//     } else {
//       if (!tankData.dimensions.height || Number(tankData.dimensions.height) <= 0) {
//         errors.push("Valid tank height is required")
//       }

//       // Shape-specific validation
//       if (
//         tankData.shape === "cylindrical" &&
//         (!tankData.dimensions.diameter || Number(tankData.dimensions.diameter) <= 0)
//       ) {
//         errors.push("Diameter is required for cylindrical tanks")
//       }

//       if (tankData.shape === "rectangular") {
//         if (!tankData.dimensions.length || Number(tankData.dimensions.length) <= 0) {
//           errors.push("Length is required for rectangular tanks")
//         }
//         if (!tankData.dimensions.width || Number(tankData.dimensions.width) <= 0) {
//           errors.push("Width is required for rectangular tanks")
//         }
//       }
//     }
//   }

//   // Fix: Check capacity.total instead of totalCapacityLiters
//   if (!isUpdate || tankData.capacity !== undefined) {
//     if (!tankData.capacity || !tankData.capacity.total || Number(tankData.capacity.total) <= 0) {
//       errors.push("Valid total capacity is required")
//     }
//   }

//   // Remove defaultDepth validation as it's not in your form
//   return errors
// }

// // Export the configured axios instance for custom requests
// export default api

import axios from "axios" // Import the Axios library for making HTTP requests.
import { getTankShapeOptions } from "./tankShapeConfigs" // NEW: Import tankShapeOptions for validation consistency

// --- Axios Instance Configuration ---

// Determine the base URL for API requests.
// It prioritizes the REACT_APP_BASE_URL environment variable,
// falling back to "http://localhost:5000" for local development.
const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

// Create a custom Axios instance. This allows for global configurations
// like base URL, timeouts, and headers, and applying interceptors.
const api = axios.create({
  baseURL: baseurl, // Set the base URL for all requests made with this instance.
  timeout: 30000, // Set a request timeout of 30 seconds (30,000 milliseconds).
  headers: {
    "Content-Type": "application/json", // Default content type for requests.
  },
})

// --- Axios Request Interceptor ---
// This interceptor modifies outgoing requests before they are sent.
api.interceptors.request.use(
  (config) => {
    // Retrieve the authentication token from browser cookies.
    // It looks for a cookie starting with "token=".
    const token = document.cookie
      .split("; ") // Split all cookies into an array of strings.
      .find((row) => row.startsWith("token=")) // Find the row that contains the token.
      ?.split("=")[1] // Extract the token value after the "=".

    // If a token is found, add it to the Authorization header as a Bearer token.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add a unique request ID to the headers for easier debugging and tracing on the backend.
    config.headers["x-request-id"] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Log the outgoing request details for debugging purposes.
    console.log(`🔄 [API] Request: ${config.method?.toUpperCase()} ${config.url}`, {
      hasToken: !!token, // Indicates if a token was included.
      requestId: config.headers["x-request-id"], // The generated request ID.
    })

    return config // Return the modified request config.
  },
  (error) => {
    // Handle any errors that occur during the request setup (e.g., network issues before sending).
    console.error("❌ [API] Request interceptor error:", error)
    return Promise.reject(error) // Propagate the error.
  },
)

// --- Axios Response Interceptor ---
// This interceptor processes responses (or errors) after they are received.
api.interceptors.response.use(
  (response) => {
    // Log the successful response details for debugging.
    console.log(`✅ [API] Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status, // HTTP status code.
      success: response.data?.success, // Custom success flag from the API response body.
      requestId: response.config.headers["x-request-id"], // The request ID associated with this response.
    })
    return response // Return the response.
  },
  (error) => {
    // Handle any errors that occur during the response (e.g., HTTP error codes).
    console.error("❌ [API] Error:", {
      url: error.config?.url, // URL of the failed request.
      method: error.config?.method, // HTTP method of the failed request.
      status: error.response?.status, // HTTP status code of the error response.
      message: error.response?.data?.message || error.message, // Error message from API or Axios.
      code: error.response?.data?.code, // Custom error code from API response.
      requestId: error.config?.headers["x-request-id"], // Request ID for the failed request.
    })

    // This interceptor focuses on general API error logging.
    // Specific authentication errors (e.g., 401 Unauthorized) are typically handled
    // by a separate AuthContext interceptor if present, which might redirect to login.
    return Promise.reject(error) // Propagate the error to the calling function.
  },
)

// --- Tank API Functions ---
// This object exports functions for interacting with tank-related API endpoints.
export const tankApi = {
  /**
   * Fetches all tanks from the API.
   * @param {object} params - Optional query parameters like limit and page for pagination.
   * @returns {Promise<object>} The API response data containing tanks and pagination info.
   * @throws {Error} If the API call fails or returns an invalid format.
   */
  getAllTanks: async (params = {}) => {
    try {
      console.log("🔄 [TankAPI] Fetching all tanks...", { params })

      // Validate and sanitize pagination parameters.
      const validatedParams = {
        ...params,
        limit: Math.min(Number(params.limit) || 50, 100), // Default limit 50, max 100.
        page: Math.max(Number(params.page) || 1, 1), // Minimum page is 1.
      }

      // Make GET request to the /api/tank-types endpoint with validated parameters.
      const response = await api.get("/api/tank-types", { params: validatedParams })

      // Check for successful response and valid data format.
      if (response.data.success && Array.isArray(response.data.data)) {
        console.log("✅ [TankAPI] Tanks fetched successfully:", {
          count: response.data.data.length,
          total: response.data.pagination?.totalCount,
          page: response.data.pagination?.currentPage,
        })
        return response.data // Return the full response data.
      } else {
        throw new Error("Invalid response format from server") // Throw error if response is malformed.
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error fetching tanks:", error)
      // Provide user-friendly error messages based on HTTP status codes or custom API codes.
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

  /**
   * Fetches a single tank by its ID.
   * @param {string} id - The ID of the tank to fetch.
   * @returns {Promise<object>} The API response data containing the tank details.
   * @throws {Error} If the ID is invalid, or the API call fails.
   */
  getTankById: async (id) => {
    try {
      // Validate MongoDB ObjectId format for the tank ID.
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid tank ID format")
      }

      console.log(`🔄 [TankAPI] Fetching tank by ID: ${id}`)
      const response = await api.get(`/api/tank-types/${id}`) // Make GET request for a specific tank.

      // Check for successful response and valid data.
      if (response.data.success && response.data.data) {
        console.log("✅ [TankAPI] Tank fetched successfully:", {
          name: response.data.data.name,
          // Use contentType if type is not present for backward compatibility.
          type: response.data.data.type || response.data.data.contentType,
          deviceCount: response.data.data.devices?.length || 0,
        })
        return response.data
      } else {
        throw new Error("Tank not found or invalid response")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error fetching tank:", error)
      // Handle specific error cases for fetching a single tank.
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

  /**
   * Creates a new tank.
   * @param {object} tankData - The data for the new tank. This object should match the `submitData`
   * prepared in `TankTypeManagementPage.js`.
   * @returns {Promise<object>} The API response data for the newly created tank.
   * @throws {Error} If client-side validation fails or the API call fails.
   */
  createTank: async (tankData) => {
    try {
      // Perform client-side validation using the shared utility function.
      const validationErrors = validateTankData(tankData)
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`)
      }

      console.log("🔄 [TankAPI] Creating new tank:", {
        name: tankData.name,
        // Using materialType from tankData, which comes from the component's formData.
        materialType: tankData.materialType,
        shape: tankData.shape,
      })

      // Make POST request to create a new tank.
      // tankData here is expected to be the `submitData` from the component,
      // which already has all values correctly formatted (numbers, etc.).
      const response = await api.post("/api/tank-types", tankData)

      if (response.data.success) {
        console.log("✅ [TankAPI] Tank created successfully:", {
          id: response.data.data?._id,
          name: response.data.data?.name,
        })
        return response.data
      } else {
        throw new Error("Failed to create tank")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error creating tank:", error)
      // Handle backend validation errors or permission issues.
      if (error.response?.status === 400 && error.response?.data?.errors) {
        throw new Error(`Validation failed: ${error.response.data.errors.join(", ")}`)
      } else if (error.response?.data?.code === "INSUFFICIENT_PERMISSIONS") {
        throw new Error("You don't have permission to create tanks")
      } else {
        throw new Error(error.response?.data?.message || error.message || "Failed to create tank")
      }
    }
  },

  /**
   * Updates an existing tank.
   * @param {string} id - The ID of the tank to update.
   * @param {object} tankData - The updated data for the tank. This object should match the `submitData`
   * prepared in `TankTypeManagementPage.js`.
   * @returns {Promise<object>} The API response data for the updated tank.
   * @throws {Error} If the ID is invalid, client-side validation fails, or the API call fails.
   */
  updateTank: async (id, tankData) => {
    try {
      // Validate MongoDB ObjectId format for the tank ID.
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid tank ID format")
      }

      // Perform client-side validation for updates (passing `true` for `isUpdate` flag).
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
        device: tankData.device, // Changed from connectedDevices to device
        alertThresholds: tankData.alertThresholds,
        deviceType: tankData.deviceType,
        offsetDepth: tankData.offsetDepth,
        bulkDensity: tankData.bulkDensity,
        totalHeight: tankData.totalHeight,
      }

      // Remove undefined values from dataToSend to avoid sending unnecessary fields or nulls if backend prefers absence.
      Object.keys(dataToSend).forEach((key) => {
        if (dataToSend[key] === undefined) {
          delete dataToSend[key]
        }
      })

      console.log(`🔄 [TankAPI] Updating tank: ${id}`, {
        name: dataToSend.name,
        hasChanges: Object.keys(dataToSend).length,
        dataToSend: dataToSend, // Log the actual data being sent for debugging.
      })

      // Make PUT request to update the tank.
      const response = await api.put(`/api/tank-types/${id}`, dataToSend)

      if (response.data.success) {
        console.log("✅ [TankAPI] Tank updated successfully:", {
          id: response.data.data?._id,
          name: response.data.data?.name,
        })
        return response.data
      } else {
        throw new Error("Failed to update tank")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error updating tank:", error)
      console.error("❌ [TankAPI] Error response data:", error.response?.data)
      console.error("❌ [TankAPI] Full error:", error)

      // Handle specific error cases for updating a tank.
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

  /**
   * Deletes a tank by its ID.
   * @param {string} id - The ID of the tank to delete.
   * @returns {Promise<object>} The API response data indicating success.
   * @throws {Error} If the ID is invalid or the API call fails.
   */
  deleteTank: async (id) => {
    try {
      // Validate MongoDB ObjectId format for the tank ID.
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
      // Handle specific error cases for deleting a tank.
      if (error.response?.status === 404) {
        throw new Error("Tank not found")
      } else if (error.response?.data?.code === "INSUFFICIENT_PERMISSIONS") {
        throw new Error("You don't have permission to delete tanks")
      } else {
        throw new Error(error.response?.data?.message || "Failed to delete tank")
      }
    }
  },

  /**
   * Assigns a device to a tank.
   * @param {string} tankId - The ID of the tank.
   * @param {string} deviceId - The ID of the device to assign.
   * @returns {Promise<object>} The API response data.
   * @throws {Error} If the API call fails.
   */
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

  /**
   * Unassigns a device from a tank.
   * @param {string} tankId - The ID of the tank.
   * @param {string} deviceId - The ID of the device to unassign.
   * @returns {Promise<object>} The API response data.
   * @throws {Error} If the API call fails.
   */
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

  /**
   * Gets tanks accessible to the current user.
   * @returns {Promise<object>} The API response data containing accessible tanks.
   * @throws {Error} If the API call fails or returns an invalid format.
   */
  getUserTanks: async () => {
    try {
      console.log("🔄 [TankAPI] Fetching user's accessible tanks...")
      const response = await api.get("/api/tank-types/user/accessible")

      if (response.data.success && Array.isArray(response.data.data)) {
        console.log("✅ [TankAPI] User tanks fetched successfully:", {
          count: response.data.data.length,
        })
        return response.data
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("❌ [TankAPI] Error fetching user tanks:", error)
      throw new Error(error.response?.data?.message || "Failed to fetch accessible tanks")
    }
  },

  /**
   * Checks the current user's general access to tanks.
   * @returns {Promise<object>} The API response data with access status and count.
   * @throws {Error} If the API call fails.
   */
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

  // NEW: Manual volume adjustment (POST to /api/volume-history)
  recordManualVolumeAdjustment: async (data) => {
    try {
      const response = await api.post('/api/volume-history', data);
      return response.data;
    } catch (error) {
      console.error("Error recording manual volume adjustment:", error);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  },

  // NEW: Fetch tank volume history from the dedicated route
  getTankVolumeHistory: async (tankId, params) => {
    try {
      // The backend route uses startDate, endDate, period, limit
      // Frontend's timeRange needs to be converted.
      const { timeRange, limit } = params;
      let startDate, endDate = new Date(); // endDate is always now

      switch (timeRange) {
        case '24h': startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); break;
        case '7d': startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        default: startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
      }

      const response = await api.get(`/api/volume-history/${tankId}`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          period: 'raw', // Request raw data for history list
          limit: limit || 100 // Default limit for history points
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching tank volume history:", error);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  },

  // NEW: Fetch aggregated tank volume statistics from the dedicated summary route
  getTankVolumeStats: async (tankId, params) => {
    try {
      const { timeRange } = params;
      const response = await api.get(`/api/volume-history/${tankId}/summary`, {
        params: { timeRange: timeRange } // Pass timeRange directly to the backend
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching tank volume stats:", error);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  },
}

// --- Device API Functions ---
// This object exports functions for general device-related API interactions.
export const deviceApi = {
  /**
   * Fetches all devices, with optional filtering for assignment status.
   * @param {object} params - Optional query parameters.
   * - `tankType`: Can be 'unassigned' to fetch only unassigned devices,
   * or a specific tank ID to include devices assigned to that tank.
   * @returns {Promise<object>} The API response data containing all devices.
   * @throws {Error} If the API call fails or returns an invalid format.
   */
  getAllDevices: async (params = {}) => {
    try {
      console.log("🔄 [DeviceAPI] Fetching all devices with params:", params);
      const response = await api.get("/api/devices", { params });

      // Expecting `response.data.data` for consistency with other getAll methods.
      // If your backend still returns `response.data.devices`, you might need to adjust this.
      const devices = response.data.data || response.data.devices;

      if (response.data.success && Array.isArray(devices)) {
        console.log("✅ [DeviceAPI] Devices fetched successfully:", devices.length, "devices");
        return { success: true, data: devices, message: "Devices fetched successfully." };
      } else {
        throw new Error("Invalid response format: Expected 'data' or 'devices' array.");
      }
    } catch (error) {
      console.error("❌ [DeviceAPI] Error fetching devices:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch devices");
    }
  },

  /**
   * Fetches a single device by its ID.
   * @param {string} id - The ID of the device to fetch.
   * @returns {Promise<object>} The API response data containing the device details.
   * @throws {Error} If the ID is invalid, or the API call fails.
   */
  getDeviceById: async (id) => {
    try {
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid device ID format");
      }
      console.log(`🔄 [DeviceAPI] Fetching device by ID: ${id}`);
      const response = await api.get(`/api/devices/${id}`);
      if (response.data.success && response.data.data) {
        console.log("✅ [DeviceAPI] Device fetched successfully:", response.data.data.name || response.data.data.serialNumber);
        return response.data;
      } else {
        throw new Error("Device not found or invalid response");
      }
    } catch (error) {
      console.error("❌ [DeviceAPI] Error fetching device:", error);
      if (error.response?.status === 404) {
        throw new Error("Device not found");
      } else {
        throw new Error(error.response?.data?.message || "Failed to fetch device details");
      }
    }
  },

  /**
   * Fetches devices that are capable of being assigned to tanks.
   * This is a more specific endpoint if your backend has one, otherwise,
   * `getAllDevices` with appropriate filtering parameters would be used.
   * (Keeping this for conceptual clarity, but `getAllDevices` with `tankType: 'unassigned'`
   * is what is primarily used for unassigned devices in TankTypeManagementPage.)
   * @returns {Promise<object>} The API response data containing tank-capable devices.
   * @throws {Error} If the API call fails or returns an invalid format.
   */
  getTankCapableDevices: async () => {
    try {
      console.log("🔄 [DeviceAPI] Fetching tank-capable devices...")
      const response = await api.get("/api/devices/tank-capable") // Assuming this endpoint exists and returns `data.devices`

      const devices = response.data.data || response.data.devices; // Handle both possible structures

      if (response.data.success && Array.isArray(devices)) {
        console.log(
          "✅ [DeviceAPI] Tank-capable devices fetched successfully:",
          devices.length || 0,
          "devices",
        )
        return { success: true, data: devices, message: "Tank-capable devices fetched successfully." };
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("❌ [DeviceAPI] Error fetching tank-capable devices:", error)
      throw new Error(error.response?.data?.message || "Failed to fetch tank-capable devices")
    }
  },
}

// --- Client-Side Validation Function ---
/**
 * Validates tank data before sending it to the API.
 * This function is shared between the API utilities and the React component for consistent validation.
 * @param {object} tankData - The tank data object to validate.
 * @param {boolean} [isUpdate=false] - Flag indicating if this is an update operation (allows partial data).
 * @returns {string[]} An array of error messages.
 */
function validateTankData(tankData, isUpdate = false) {
  const errors = []

  // Define deviceNeedsOffset within the scope of validateTankData
  // so it's guaranteed to be available when called.
  const deviceNeedsOffset = (deviceType) => {
    return ["ultrasonic_level_sensor", "radar_level_sensor", "laser_level_sensor"].includes(deviceType);
  };

  // Get valid tank shapes dynamically from tankShapeConfigs
  const validTankShapes = getTankShapeOptions().map(s => s.value);

  // Validate name: required and max length.
  // For updates, only validate if `name` is explicitly provided in `tankData`.
  if (!isUpdate || tankData.name !== undefined) {
    if (!tankData.name || tankData.name.trim().length === 0) {
      errors.push("Tank name is required")
    } else if (tankData.name.length > 100) {
      errors.push("Tank name cannot exceed 100 characters")
    }
  }

  // Validate materialType (which is `contentType` in the backend's perspective).
  // The component sends `materialType`, so we validate `tankData.materialType`.
  if (!isUpdate || tankData.materialType !== undefined) {
    if (!tankData.materialType || !["liquid", "solid", "gas", "mixed"].includes(tankData.materialType)) {
      errors.push("Valid material type is required")
    }
  }

  // Validate shape.
  if (!isUpdate || tankData.shape !== undefined) {
    if (!tankData.shape || !validTankShapes.includes(tankData.shape)) {
      errors.push("Valid tank shape is required")
    }
  }

  // Validate dimensions object.
  if (!isUpdate || tankData.dimensions !== undefined) {
    if (!tankData.dimensions || typeof tankData.dimensions !== "object") {
      errors.push("Tank dimensions are required")
    } else {
      // Validate height.
      if (tankData.dimensions.height === null || Number(tankData.dimensions.height) <= 0 || isNaN(Number(tankData.dimensions.height))) {
        errors.push("Valid tank height is required")
      }

      // Shape-specific dimension validation.
      if (
        tankData.shape === "cylindrical" &&
        (tankData.dimensions.diameter === null || Number(tankData.dimensions.diameter) <= 0 || isNaN(Number(tankData.dimensions.diameter)))
      ) {
        errors.push("Diameter is required for cylindrical tanks")
      }

      if (tankData.shape === "rectangular") {
        if (tankData.dimensions.length === null || Number(tankData.dimensions.length) <= 0 || isNaN(Number(tankData.dimensions.length))) {
          errors.push("Length is required for rectangular tanks")
        }
        if (tankData.dimensions.width === null || Number(tankData.dimensions.width) <= 0 || isNaN(Number(tankData.dimensions.width))) {
          errors.push("Width is required for rectangular tanks")
        }
      }
      // Silo-specific dimension validation
      if (tankData.shape === "silo") {
        if (tankData.dimensions.totalHeight === null || Number(tankData.dimensions.totalHeight) <= 0 || isNaN(Number(tankData.dimensions.totalHeight))) {
          errors.push("Total height is required for silo tanks");
        }
        if (tankData.dimensions.coneAngle === null || Number(tankData.dimensions.coneAngle) <= 0 || isNaN(Number(tankData.dimensions.coneAngle))) {
          errors.push("Cone angle is required for silo tanks");
        }
        if (tankData.dimensions.ullage === null || Number(tankData.dimensions.ullage) < 0 || isNaN(Number(tankData.dimensions.ullage))) { // Ullage can be 0
          errors.push("Ullage is required for silo tanks and must be non-negative");
        }
        if (tankData.dimensions.groundClearance === null || Number(tankData.dimensions.groundClearance) < 0 || isNaN(Number(tankData.dimensions.groundClearance))) {
            errors.push("Ground clearance is required for silo tanks and must be non-negative");
        }
        if (tankData.dimensions.outletDiameter === null || Number(tankData.dimensions.outletDiameter) <= 0 || isNaN(Number(tankData.dimensions.outletDiameter))) {
            errors.push("Outlet diameter is required for silo tanks and must be positive");
        }
      }
    }
  }

  // Validate capacity.
  if (!isUpdate || tankData.capacity !== undefined) {
    if (Number(tankData.capacity) <= 0 || isNaN(Number(tankData.capacity))) {
      errors.push("Valid total capacity is required")
    }
  }

  // Validate alert thresholds.
  if (!isUpdate || tankData.alertThresholds !== undefined) {
    const { low, high, critical } = tankData.alertThresholds || {};
    // Only validate if the field is present OR if it's a new tank (not an update allowing partial fields)
    if ((!isUpdate || low !== undefined) && (low === null || isNaN(Number(low)))) {
      errors.push("Low alert level is required and must be a number");
    }
    if ((!isUpdate || high !== undefined) && (high === null || isNaN(Number(high)))) {
      errors.push("High alert level is required and must be a number");
    }
    if ((!isUpdate || critical !== undefined) && (critical === null || isNaN(Number(critical)))) {
      errors.push("Critical alert level is required and must be a number");
    }
    // Add logic to ensure low < high < critical if needed, or other range checks.
  }

  // Validate bulk density if materialType is solid.
  if (tankData.materialType === "solid" && (tankData.bulkDensity === undefined || Number(tankData.bulkDensity) <= 0 || isNaN(Number(tankData.bulkDensity)))) {
    errors.push("Bulk density is required for solid materials and must be a positive number");
  }

  // Validate deviceType and offsetDepth if deviceNeedsOffset.
  if (!isUpdate || tankData.deviceType !== undefined) {
    if (!tankData.deviceType) {
      errors.push("Device type is required");
    } else if (deviceNeedsOffset(tankData.deviceType)) {
      if (tankData.offsetDepth === undefined || Number(tankData.offsetDepth) < 0 || isNaN(Number(tankData.offsetDepth))) {
        errors.push("Sensor offset is required for the selected device type and must be a non-negative number");
      }
    }
  }

  return errors // Return the array of validation errors.
}

// Export the configured Axios instance as the default export,
// allowing other modules to import it for general API requests.
export default api
