"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { useCookies } from "react-cookie"
import { useRealtimeData } from "../hooks/useRealtimeData"
import { useSystemMonitoring } from "../hooks/useSystemMonitoring"
import useLogout from "../hooks/useLogout"
import { SearchProvider, useSearch } from "../contexts/SearchContext"
import ResponsiveNavigation from "./ResponsiveNavigation"
import { useAuth } from "../contexts/AuthContext"
import OfflineIndicator from "./OfflineIndicator"
import {
  CheckSquare as ChartSquareBar,
  UsersRound as UserGroup,
  Search,
  UserCircle,
  Sun,
  Moon,
  HardDrive,
  MapPin,
  Gauge,
  Droplet,
  LogOut,
  User,
  Edit3,
  Sparkles,
  X,
  Bell,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wifi,
} from "lucide-react"
import { useGlobalAlertsIntegration } from "../hooks/useGlobalAlertsIntegration"

function HomePageContent() {
  const [open, setOpen] = useState(true)
  const [cookies] = useCookies(["token"])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode")
      return savedMode ? JSON.parse(savedMode) : false
    }
    return false
  })

  const nav = useNavigate()
  const location = useLocation()
  const [searchFocused, setSearchFocused] = useState(false)
  const { globalSearchTerm, setGlobalSearchTerm } = useSearch()
  const logout = useLogout()

  const { user: authUser, loadingAuth, isAuthenticated, axiosInstance } = useAuth()

  // Real-time user data with staggered loading
  const {
    data: userInfo,
    loading: userLoading,
    isConnected: userConnected,
    error: userError,
  } = useRealtimeData("user_info", {
    cacheKey: "user_info_cache",
    enablePersistence: true,
    requestThrottle: 15000, // 15 seconds
    maxRetries: 2,
  })

  // Real-time tank access data with even longer throttle
  const {
    data: tankAccessData,
    loading: tankAccessLoading,
    error: tankAccessError,
  } = useRealtimeData("tank_access", {
    cacheKey: "tank_access_cache",
    enablePersistence: true,
    requestThrottle: 45000, // 45 seconds
    maxRetries: 2,
  })

  // System monitoring with optimized settings
  const {
    systemHealth,
    isHealthy,
    isDegraded,
    isUnhealthy,
    isConnected: systemConnected,
    connectionStatus,
    manualRefresh,
    isUsingRealtime,
    error: systemError,
  } = useSystemMonitoring({
    enableHealthCheck: true,
    enableStats: false,
    refreshInterval: 300000, // 5 minutes
    requestThrottle: 60000, // 1 minute
    maxRetries: 2,
  })

  // Computed values with error handling
  const userCanViewTanks = useMemo(() => {
    try {
      if (userInfo?.role === "admin") return true
      if (tankAccessData?.hasAccess) return true
      return false
    } catch (error) {
      console.error("Error computing tank access:", error)
      return false
    }
  }, [userInfo?.role, tankAccessData?.hasAccess])

  // Use the same global alerts integration as AlertsPage
  const { activeAlerts, error: alertsError, isProcessing, quickStats, refreshAlerts } = useGlobalAlertsIntegration()
  
  // 🚨 NEW: Log alertsError to console since the UI indicator ( "!" ) is being removed.
  useEffect(() => {
      if (alertsError) {
          console.error("⚠️ Global Alerts Integration Error:", alertsError)
      }
  }, [alertsError])

  // Use activeAlerts for the sidebar icon and count
  const processedGlobalAlerts = useMemo(() => {
    return activeAlerts || []
  }, [activeAlerts])

  // Redirect logic based on role (use auth user if real-time data not available)
  useEffect(() => {
    if (!loadingAuth && isAuthenticated && authUser) {
      const currentPath = location.pathname
      if (authUser.role === "user" && currentPath === "/dashboard") {
        nav("/my-dashboard", { replace: true })
      } else if (authUser.role === "admin" && currentPath === "/my-dashboard") {
        nav("/dashboard", { replace: true })
      }
    }
  }, [authUser, nav, location.pathname, loadingAuth, isAuthenticated])

  // Dark mode persistence
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode))
    if (darkMode) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }, [darkMode])

  // Centralized logout handler
  const handleLogout = useCallback(() => {
    logout()
    setDropdownOpen(false)
  }, [logout])

  const toggleDropdown = useCallback(() => setDropdownOpen((prev) => !prev), [])
  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), [])

  // Updated sidebar items with real-time data and error states
  const AllSidebarItems = useMemo(
    () => [
      {
        name: "Admin Dashboard",
        path: "/dashboard",
        icon: <ChartSquareBar size={20} />,
        roles: ["admin"],
        gradient: "from-blue-500 to-cyan-500",
      },
      {
        name: "Users",
        path: "/users",
        icon: <UserGroup size={20} />,
        roles: ["admin"],
        gradient: "from-purple-500 to-pink-500",
      },
      {
        name: "Blog Admin",
        path: "/admin/blog",
        icon: <FileText size={20} />,
        roles: ["admin"],
        gradient: "from-indigo-500 to-purple-500",
      },
      {
        name: "My Dashboard",
        path: "/my-dashboard",
        icon: <Gauge size={20} />,
        roles: ["user", "technician"],
        gradient: "from-green-500 to-emerald-500",
      },
      {
        name: "Devices",
        path: "/devices",
        icon: <HardDrive size={20} />,
        roles: ["admin", "user", "technician"],
        gradient: "from-orange-500 to-red-500",
      },
      {
        name: "Alerts",
        path: "/alerts",
        icon: (
          <div className="relative flex items-center">
            <Bell size={20} />
            {/* ✅ FIX 1 & 2: Only show the count bubble if activeCount > 0.
              This prevents "Alerts0" and keeps the icon clean when no alerts exist.
            */}
            {quickStats.activeCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse min-w-[20px]">
                {quickStats.activeCount > 99 ? "99+" : quickStats.activeCount}
              </span>
            )}
            {/* 🛑 REMOVED: The alertsError indicator (the "!" mark) is removed from the UI.
              The error is now logged via the useEffect hook above.
            */}
            {/* {alertsError && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-3 w-3 flex items-center justify-center">
                !
              </span>
            )} */}
          </div>
        ),
        roles: ["admin", "user", "technician"],
        gradient: "from-yellow-500 to-orange-500",
        
        // 🛑 FIX 3: Removed alertCount. This was the source of the "double count" 
        // next to the menu item's name (e.g., "Alerts 5").
        // alertCount: quickStats.activeCount, 
        
        hasError: !!alertsError,
        isProcessing,
        refreshAlerts,
      },
      {
        name: "Map",
        path: "/map",
        icon: <MapPin size={20} />,
        roles: ["admin", "user", "technician"],
        gradient: "from-teal-500 to-cyan-500",
      },
      {
        name: "Tank Types",
        path: "/tanks",
        icon: (
          <div className="relative flex items-center">
            <Droplet size={20} />
            {tankAccessLoading && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-3 w-3 flex items-center justify-center animate-spin">
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </span>
            )}
            {tankAccessError && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-3 w-3 flex items-center justify-center">
                !
              </span>
            )}
          </div>
        ),
        roles: ["admin", "user", "technician"],
        gradient: "from-blue-500 to-indigo-500",
        requiresTankAccess: true,
        description: "Manage liquid and solid storage tanks & silos",
        hasError: !!tankAccessError,
      },
    ],
    [
      quickStats.activeCount,
      alertsError,
      isProcessing,
      refreshAlerts,
      systemHealth,
      isHealthy,
      tankAccessLoading,
      systemError,
      // ...other dependencies...
    ],
  )

  const filteredSidebarItems = useMemo(() => {
    // Use authUser instead of userInfo for role checking
    if (!authUser || !authUser.role) return []

    try {
      const filtered = AllSidebarItems.filter((item) => {
        // Check role access
        if (!item.roles.includes(authUser.role)) return false

        // For admin, show all items
        if (authUser.role === "admin") return true

        // For tank types, check enhanced access logic
        if (item.requiresTankAccess) {
          return userCanViewTanks
        }

        // For other items, show if user role is included
        return true
      })

      return filtered
    } catch (error) {
      console.error("Error filtering sidebar items:", error)
      return []
    }
  }, [authUser, AllSidebarItems, userCanViewTanks])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    // Handle search submission logic here
  }

  const clearSearch = () => {
    setGlobalSearchTerm("")
  }

  // Show loading spinner only if authentication is in progress, not if real-time data is loading
  if (loadingAuth || !isAuthenticated || !authUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto mb-6"></div>
            <Sparkles
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 animate-pulse"
              size={24}
            />
          </div>
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Loading IoT Dashboard</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Authenticating user...</p>

          {/* Connection status indicators */}
          <div className="mt-4 space-y-2">
            {userConnected && (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <Wifi className="w-4 h-4" />
                <span className="text-sm">WebSocket Connected</span>
              </div>
            )}

            {userError && (
              <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Connection Issues</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col lg:flex-row h-screen ${darkMode ? "dark" : ""} bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950`}
    >
      <OfflineIndicator />

      <ResponsiveNavigation
        open={open}
        setOpen={setOpen}
        filteredSidebarItems={filteredSidebarItems}
        userInfo={authUser}
        logout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        systemHealth={systemHealth}
        isHealthy={isHealthy}
        isDegraded={isDegraded}
        isUnhealthy={isUnhealthy}
        userCanViewTanks={userCanViewTanks}
        tankAccessLoading={tankAccessLoading}
        className="text-gray-800 dark:text-white"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header - Enhanced with real-time indicators and error states */}
        <div className="hidden lg:flex bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900 text-white p-4 shadow-xl">
          <div className="flex-1 max-w-2xl mr-6">
            <form onSubmit={handleSearchSubmit} className="relative group">
              <div className={`relative transition-all duration-300 ${searchFocused ? "scale-105" : ""}`}>
                <input
                  type="search"
                  placeholder="Search devices, users, alerts, tanks..."
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/70 rounded-2xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all duration-300 border border-white/20"
                />
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 group-hover:text-white transition-colors duration-200"
                />
                {globalSearchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {searchFocused && globalSearchTerm && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Press Enter to search for "{globalSearchTerm}"
                  </p>
                </div>
              )}
            </form>
          </div>
          <div className="flex items-center space-x-4">
            {/* Real-time System Status with error handling */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
              {isHealthy && <CheckCircle className="w-4 h-4 text-green-400" />}
              {isDegraded && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
              {isUnhealthy && <XCircle className="w-4 h-4 text-red-400" />}
              {systemError && <AlertTriangle className="w-4 h-4 text-orange-400" />}
              <span className="text-sm font-medium">
                System: {systemError ? "Error" : systemHealth?.status || "Unknown"}
                {isUsingRealtime && <span className="text-green-300 ml-1">●</span>}
              </span>
            </div>

            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
              <div
                className={`w-2 h-2 rounded-full ${systemConnected ? "bg-green-400 animate-pulse" : "bg-orange-400"}`}
              ></div>
              <span className="text-sm font-medium">{systemConnected ? "Live" : "Offline"}</span>
            </div>

            {/* Tank Access Indicator for Users with error state */}
            {authUser?.role === "user" && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
                <Droplet className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Tanks:{" "}
                  {tankAccessError
                    ? "Error"
                    : tankAccessLoading
                      ? "Checking..."
                      : userCanViewTanks
                        ? "Available"
                        : "No Access"}
                </span>
                {tankAccessError && <AlertTriangle className="w-3 h-3 text-orange-400 ml-1" />}
              </div>
            )}

            <button
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm group"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleDarkMode}
            >
              {darkMode ? (
                <Sun size={20} className="text-yellow-300 group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Moon size={20} className="text-blue-200 group-hover:scale-110 transition-transform duration-200" />
              )}
            </button>
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm group"
                title="User menu"
              >
                <UserCircle size={24} className="group-hover:scale-110 transition-transform duration-200" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-2xl py-2 z-50 border border-white/20 dark:border-gray-700/50">
                  <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{authUser?.emailid}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300 capitalize">{authUser?.role} Account</p>
                    {authUser?.role === "user" && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Tank Access:{" "}
                        {tankAccessError ? "Error" : userCanViewTanks ? "✓ Enabled" : "✗ No devices assigned"}
                      </p>
                    )}
                    {isUsingRealtime && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                        <Wifi className="w-3 h-3" />
                        Real-time Connected
                      </div>
                    )}
                  </div>
                  {/* <button
                    onClick={() => {
                      nav("/myprofile")
                      setDropdownOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <User size={16} className="mr-3" />
                    My Profile
                  </button> */}
                  {/* <button
                    onClick={() => {
                      nav("/editprofile")
                      setDropdownOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <Edit3 size={16} className="mr-3" />
                    Edit Profile
                  </button> */}

                  <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                  >
                    <LogOut size={16} className="mr-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900/50 dark:via-slate-900/30 dark:to-indigo-950/50 backdrop-blur-sm">
          <div className="p-3 sm:p-6 text-gray-800 dark:text-white">
            <Outlet
              context={{
                userRole: authUser?.role,
                canViewTankTypes: userCanViewTanks,
                globalAlerts: processedGlobalAlerts,
                systemHealth: systemHealth,
                isHealthy: isHealthy,
                isDegraded: isDegraded,
                isUnhealthy: isUnhealthy,
                userInfo: authUser,
                isRealtimeConnected: systemConnected,
                isUsingRealtime: isUsingRealtime,
                hasErrors: {
                  system: !!systemError,
                  alerts: !!alertsError,
                  tankAccess: !!tankAccessError,
                  user: !!userError,
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function HomePage() {
  return (
    <SearchProvider>
      <HomePageContent />
    </SearchProvider>
  )
}

export default HomePage