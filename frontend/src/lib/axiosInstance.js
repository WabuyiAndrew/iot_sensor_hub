import axios from "axios"

// Create an Axios instance for API calls with optimized settings
const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 30000, // 30 second timeout due to slow backend
  maxRedirects: 3,
  baseURL: process.env.REACT_APP_BASE_URL || "http://localhost:5050",
})

// Request interceptor to add auth headers
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from cookies or localStorage
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1]

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log("[axiosInstance - Request Interceptor] Added Authorization header")
    }
    return config
  },
  (error) => {
    console.error("[axiosInstance - Request Interceptor] Error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor for handling auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("[axiosInstance - Response Interceptor] Error response:", error.response?.status, error.response?.data)

    // Check if the error is an authentication error (401 or 403)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("[axiosInstance - Interceptor] Authentication error caught:", error.response.status)

      // Clear token and redirect to login
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      localStorage.removeItem("lastAuthToast")

      // Only redirect if not already on login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
