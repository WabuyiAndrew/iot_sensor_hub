"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useCookies } from "react-cookie"
import { useNavigate, useLocation } from "react-router-dom"
import axiosInstance from "../lib/axiosInstance"
import { toast } from "react-hot-toast"
import { isProtectedRoute } from "../lib/utils"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [cookies, setCookie, removeCookie] = useCookies(["token"])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [lastProfileFetch, setLastProfileFetch] = useState(0)

  const isManuallyLoggingOut = useRef(false)
  const profileFetchTimeoutRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"
  const PROFILE_FETCH_THROTTLE = 30000 // Increased to 30 seconds

  useEffect(() => {
    // Request interceptor to add auth headers
    const requestInterceptor = axiosInstance.interceptors.request.use(
      (config) => {
        const token = cookies.token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
          console.log("[AuthContext - Request Interceptor] Added Authorization header")
        }
        return config
      },
      (error) => {
        console.error("[AuthContext - Request Interceptor] Error:", error)
        return Promise.reject(error)
      },
    )

    // Response interceptor for handling auth errors with throttling
    const responseInterceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.log(
          "[AuthContext - Response Interceptor] Error response:",
          error.response?.status,
          error.response?.data,
        )

        // Check if the error is an authentication error (401 or 403)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.warn("[AuthContext - Interceptor] Authentication error caught:", error.response.status)

          // Only trigger logout logic if not already in a manual logout process
          if (!isManuallyLoggingOut.current) {
            console.log("[AuthContext - Interceptor] Triggering automatic logout due to auth error.")
            removeCookie("token", { path: "/" })
            setIsAuthenticated(false)
            setUser(null)
            localStorage.removeItem("lastAuthToast")
            navigate("/login")

            // Throttled error message
            const lastToastTime = localStorage.getItem("lastAuthToast")
            const now = Date.now()
            if (!lastToastTime || now - Number.parseInt(lastToastTime) > 10000) {
              toast.error(error.response.data?.message || "Session expired. Please log in again.")
              localStorage.setItem("lastAuthToast", now.toString())
            }
          }
        }
        return Promise.reject(error)
      },
    )

    // Clean up the interceptors on unmount
    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor)
      axiosInstance.interceptors.response.eject(responseInterceptor)
    }
  }, [cookies.token, removeCookie, navigate])

  const fetchUserProfile = useCallback(
    async (token) => {
      const now = Date.now()

      // Throttle profile fetches
      if (now - lastProfileFetch < PROFILE_FETCH_THROTTLE) {
        console.log(
          `[AuthContext - fetchUserProfile] Throttling profile fetch, ${Math.ceil((PROFILE_FETCH_THROTTLE - (now - lastProfileFetch)) / 1000)}s remaining`,
        )
        return user // Return existing user data
      }

      console.log("[AuthContext - fetchUserProfile] Starting fetch for user profile...")

      if (!token) {
        console.log("[AuthContext - fetchUserProfile] No token provided. Setting user=null, isAuthenticated=false.")
        setUser(null)
        setIsAuthenticated(false)
        setLoadingAuth(false)
        if (!isManuallyLoggingOut.current && isProtectedRoute(location.pathname)) {
          console.log("[AuthContext - fetchUserProfile] No token and accessing protected route. Redirecting to /login.")
          navigate("/login")
        }
        return null
      }

      setLastProfileFetch(now)

      try {
        console.log("[AuthContext - fetchUserProfile] Making request to profile endpoint...")

        const response = await axiosInstance.get(`${baseurl}/api/users/profile`, {
          timeout: 30000, // Increased to 30 seconds due to slow backend
        })

        console.log("[AuthContext - fetchUserProfile] Profile fetch successful. Response data:", response.data)
        const userData = response.data.data || response.data.user || response.data
        console.log("[AuthContext - fetchUserProfile] Extracted user data:", userData)

        setUser(userData)
        setIsAuthenticated(true)
        isManuallyLoggingOut.current = false // Reset on successful authentication
        return userData
      } catch (err) {
        console.error("[AuthContext - fetchUserProfile] Failed to fetch user profile:", err)

        if (err.code === "ECONNABORTED") {
          console.error("[AuthContext - fetchUserProfile] Request timeout")
          const lastToastTime = localStorage.getItem("lastAuthToast")
          const now = Date.now()
          if (!lastToastTime || now - Number.parseInt(lastToastTime) > 10000) {
            toast.error("Connection timeout. Retrying...")
            localStorage.setItem("lastAuthToast", now.toString())
          }

          setTimeout(() => {
            if (token && !isManuallyLoggingOut.current) {
              console.log("[AuthContext] Retrying profile fetch after timeout...")
              fetchUserProfile(token)
            }
          }, 5000)

          return user // Return existing user data
        } else if (
          !isManuallyLoggingOut.current &&
          (!err.response || (err.response.status !== 401 && err.response.status !== 403))
        ) {
          const lastToastTime = localStorage.getItem("lastAuthToast")
          const now = Date.now()
          if (!lastToastTime || now - Number.parseInt(lastToastTime) > 10000) {
            toast.error(err.response?.data?.message || "Failed to load profile. Please try again.")
            localStorage.setItem("lastAuthToast", now.toString())
          }
        }

        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          setUser(null)
          setIsAuthenticated(false)
        }

        return null
      } finally {
        console.log("[AuthContext - fetchUserProfile] Finished fetch. Setting loadingAuth to false.")
        setLoadingAuth(false)
      }
    },
    [baseurl, navigate, location.pathname, lastProfileFetch, user],
  )

  useEffect(() => {
    // Clear any existing timeout
    if (profileFetchTimeoutRef.current) {
      clearTimeout(profileFetchTimeoutRef.current)
    }

    console.log(
      "[AuthContext - useEffect] Token in cookies changed or initial load. Current token:",
      cookies.token ? "exists" : "does not exist",
    )

    if (cookies.token) {
      isManuallyLoggingOut.current = false // Reset if a token is present

      profileFetchTimeoutRef.current = setTimeout(() => {
        fetchUserProfile(cookies.token)
      }, 200) // Reduced from 500ms to 200ms
    } else {
      console.log("[AuthContext - useEffect] No token found. Setting auth states directly.")
      setUser(null)
      setIsAuthenticated(false)
      setLoadingAuth(false)

      // Only navigate to login if accessing a protected route and not explicitly logging out manually.
      if (!isManuallyLoggingOut.current && isProtectedRoute(location.pathname)) {
        console.log("[AuthContext - useEffect] No token and accessing protected route. Redirecting to /login.")
        navigate("/login")
      }
    }

    return () => {
      if (profileFetchTimeoutRef.current) {
        clearTimeout(profileFetchTimeoutRef.current)
      }
    }
  }, [cookies.token, fetchUserProfile, navigate, location.pathname])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (profileFetchTimeoutRef.current) {
        clearTimeout(profileFetchTimeoutRef.current)
      }
    }
  }, [])

  const login = async (token, rememberMe = false) => {
    console.log("[AuthContext - login] Attempting to set token and log in. Token:", token ? "exists" : "missing")

    // Set cookie with appropriate expiration
    const cookieOptions = {
      path: "/",
      maxAge: rememberMe ? 3600 * 24 * 30 : 3600 * 24, // 30 days if remember me, otherwise 1 day
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    }

    setCookie("token", token, cookieOptions)
    setIsAuthenticated(true)
    isManuallyLoggingOut.current = false

    setTimeout(async () => {
      const userData = await fetchUserProfile(token)
      if (userData) {
        // Navigate based on user role
        if (userData.role === "admin") {
          console.log("[AuthContext - login] Admin user, navigating to /dashboard.")
          navigate("/dashboard")
        } else {
          console.log("[AuthContext - login] Regular user, navigating to /my-dashboard.")
          navigate("/my-dashboard")
        }
      }
    }, 50) // Reduced from 100ms to 50ms
  }

  const logout = () => {
    console.log("[AuthContext - logout] Logging out user. Clearing states and triggering redirect.")
    isManuallyLoggingOut.current = true
    removeCookie("token", { path: "/" })
    setIsAuthenticated(false)
    setUser(null)
    setLastProfileFetch(0) // Reset throttle
    localStorage.removeItem("lastAuthToast")

    // Clear any pending profile fetch
    if (profileFetchTimeoutRef.current) {
      clearTimeout(profileFetchTimeoutRef.current)
    }

    navigate("/")
  }

  if (loadingAuth) {
    console.log("[AuthContext - Render] Displaying authentication loading state...")
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg mb-2">Authenticating...</p>
          <p className="text-sm text-gray-400">This may take a moment due to server load</p>
          <button
            onClick={() => {
              setLoadingAuth(false)
              if (cookies.token) {
                fetchUserProfile(cookies.token)
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            Retry Authentication
          </button>
        </div>
      </div>
    )
  }

  console.log("[AuthContext - Render] Providing context values. isAuthenticated:", isAuthenticated, "User:", user)

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        token: cookies.token,
        loadingAuth,
        axiosInstance,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Export the axios instance for use in API utilities
export { axiosInstance }
