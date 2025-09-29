
const axios = require("axios")
const { ErrorResponse } = require("../utils/errorResponse")
const https = require("https")

class ExternalApiService {
  constructor() {
    // Change baseURL to use HTTPS
    this.baseURL = "https://188.166.125.28/nkusu-iot/api/nkusu-iot"
    this.timeout = 30000 // 30 seconds timeout

    // Create a new HTTPS agent to bypass SSL certificate validation
    const agent = new https.Agent({
      rejectUnauthorized: false,
    })

    // Create axios instance with default config
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      httpsAgent: agent, // Use the new agent for HTTPS requests
    })

    // Add request interceptor for logging
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log(`[External API] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error("[External API] Request error:", error)
        return Promise.reject(error)
      },
    )

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => {
        console.log(`[External API] Response: ${response.status} ${response.statusText}`)
        return response
      },
      (error) => {
        console.error("[External API] Response error:", error.message)
        return Promise.reject(this.handleApiError(error))
      },
    )
  }

  handleApiError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      return new ErrorResponse(
        data?.message || `External API error: ${status}`,
        status,
        data?.code || "EXTERNAL_API_ERROR",
        data,
      )
    } else if (error.request) {
      // Request was made but no response received
      return new ErrorResponse("External API is not responding", 503, "SERVICE_UNAVAILABLE")
    } else {
      // Something else happened
      return new ErrorResponse("Failed to connect to external API", 500, "CONNECTION_ERROR")
    }
  }

  // Fetch device status from external API
  async getDeviceStatus(devices = []) {
    try {
      if (devices.length === 0) {
        throw new ErrorResponse("The 'devices' parameter is required for this API endpoint.", 400, "MISSING_PARAMETER")
      }

      const deviceQuery = devices.join(",")
      const params = { devices: deviceQuery }

      const response = await this.apiClient.get("/status", { params })

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw error
    }
  }

  // Fetch analytics data from external API
  async getAnalyticsData(options = {}) {
    try {
      const { startDate, endDate, period = "MONTHLY", deviceType = "Level1", deviceNo } = options

      const params = {
        period,
        deviceType,
      }

      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      // Add the new deviceNo parameter if it exists
      if (deviceNo) params.deviceNo = deviceNo

      const response = await this.apiClient.get("/analytic-data", { params })

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw error
    }
  }

  // Fetch raw sensor data from external API
  async getSensorData(options = {}) {
    try {
      const { page = 0, size = 10, deviceId, startDate, endDate, sensorType } = options

      const params = { page, size }

      if (deviceId) params.deviceId = deviceId
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (sensorType) params.sensorType = sensorType

      const response = await this.apiClient.get("/sensor-data", { params })

      return {
        success: true,
        data: response.data,
        pagination: {
          page,
          size,
          total: response.data?.totalElements || 0,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw error
    }
  }

  // Generic method for custom API calls
  async makeRequest(endpoint, method = "GET", data = null, params = {}) {
    try {
      const config = {
        method: method.toLowerCase(),
        url: endpoint,
        params,
      }

      if (data && ["post", "put", "patch"].includes(method.toLowerCase())) {
        config.data = data
      }

      const response = await this.apiClient(config)

      return {
        success: true,
        data: response.data,
        status: response.status,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw error
    }
  }
}

// Export singleton instance
module.exports = new ExternalApiService()
