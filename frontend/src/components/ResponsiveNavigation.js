"use client"
import { useState, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSearch } from "../contexts/SearchContext"
import { ChevronLeft, Menu, X, Zap, Search, UserCircle, Sun, Moon, LogOut, User, Edit3, Activity, CheckCircle, AlertTriangle, XCircle, Droplet } from 'lucide-react'

const ResponsiveNavigation = ({
  open,
  setOpen,
  filteredSidebarItems,
  userInfo,
  logout,
  darkMode,
  toggleDarkMode,
  systemHealth,
  isHealthy,
  isDegraded,
  isUnhealthy,
  userCanViewTanks,
  tankAccessLoading
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { globalSearchTerm, setGlobalSearchTerm } = useSearch()

  const toggleSidebar = useCallback(() => setOpen((prev) => !prev), [setOpen])
  
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev)
    setMobileProfileOpen(false)
  }, [])
  
  const toggleMobileProfile = useCallback(() => {
    setMobileProfileOpen((prev) => !prev)
    setMobileMenuOpen(false)
  }, [])

  const isActivePath = useCallback(
    (itemPath) => {
      const currentPath = location.pathname || ""
      if (itemPath === "/dashboard" && currentPath === "/dashboard") return true
      if (itemPath === "/my-dashboard" && currentPath === "/my-dashboard") return true
      if (itemPath === "/devices" && currentPath.startsWith("/devices")) return true
      if (itemPath === "/tanks" && currentPath.startsWith("/tanks")) return true
      if (itemPath === "/users" && currentPath.startsWith("/users")) return true
      if (itemPath === "/map" && currentPath.startsWith("/map")) return true
      if (itemPath === "/alerts" && currentPath.startsWith("/alerts")) return true
      if (itemPath === "/system-monitoring" && currentPath.startsWith("/system-monitoring")) return true
      return currentPath === itemPath
    },
    [location.pathname],
  )

  const handleNavigation = useCallback(
    (path) => {
      console.log("Navigating to:", path)
      navigate(path)
      setMobileMenuOpen(false)
      setMobileProfileOpen(false)
    },
    [navigate],
  )

  const handleLogoutClick = useCallback(() => {
    logout()
    setMobileMenuOpen(false)
    setMobileProfileOpen(false)
  }, [logout])

  const clearSearch = useCallback(() => {
    setGlobalSearchTerm("")
  }, [setGlobalSearchTerm])

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault()
    setMobileSearchFocused(false)
  }, [])

  return (
    <>
      {/* Enhanced Mobile Header - Fixed responsive issues */}
      <div className="lg:hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900 text-white shadow-xl relative z-40">
        {/* Top Row - Logo and Controls - Made more compact */}
        <div className="flex justify-between items-center px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center flex-1 min-w-0">
            <button
              onClick={toggleMobileMenu}
              className="mr-2 sm:mr-3 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm flex-shrink-0"
            >
              {mobileMenuOpen ? (
                <X size={18} className="sm:w-5 sm:h-5 transform rotate-180 transition-transform duration-300" />
              ) : (
                <Menu size={18} className="sm:w-5 sm:h-5 transform transition-transform duration-300" />
              )}
            </button>
            <div className="flex items-center min-w-0 flex-1">
              <Zap className="mr-1.5 sm:mr-2 text-yellow-300 flex-shrink-0" size={16} />
              <span className="text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent truncate">
                IoT Dashboard
              </span>
            </div>
          </div>
          
          {/* Right side controls - Made more compact */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* System Health Indicator - Responsive */}
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-white/10 backdrop-blur-sm rounded-md sm:rounded-lg">
              {isHealthy && <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />}
              {isDegraded && <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
              {isUnhealthy && <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />}
              <span className="text-xs font-medium hidden sm:inline truncate">
                {systemHealth?.status || "Unknown"}
              </span>
            </div>
            
            {/* Dark mode toggle */}
            <button
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm flex-shrink-0"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleDarkMode}
            >
              {darkMode ? (
                <Sun size={14} className="sm:w-4 sm:h-4 text-yellow-300" />
              ) : (
                <Moon size={14} className="sm:w-4 sm:h-4 text-blue-200" />
              )}
            </button>
            
            {/* Profile button */}
            <button
              onClick={toggleMobileProfile}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm relative flex-shrink-0"
              title="User menu"
            >
              <UserCircle size={16} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - Made fully responsive */}
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className={`relative transition-all duration-300 ${mobileSearchFocused ? "scale-[1.02]" : ""}`}>
              <input
                type="search"
                placeholder="Search..."
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                onFocus={() => setMobileSearchFocused(true)}
                onBlur={() => setMobileSearchFocused(false)}
                className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/70 rounded-lg sm:rounded-xl py-2 sm:py-2.5 pl-8 sm:pl-10 pr-8 sm:pr-10 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all duration-300 border border-white/20 text-sm"
              />
              <Search
                size={14}
                className="sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-white/70"
              />
              {globalSearchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                >
                  <X size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tank Access Indicator for Users - Made responsive */}
        {userInfo?.role === "user" && (
          <div className="px-3 pb-2 sm:px-4 sm:pb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 backdrop-blur-sm rounded-md sm:rounded-lg">
              <Droplet className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs font-medium truncate">
                Tanks: {tankAccessLoading ? "Checking..." : userCanViewTanks ? "Available" : "No Access"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Profile Dropdown - Made responsive */}
      {mobileProfileOpen && (
        <div className="lg:hidden fixed top-14 sm:top-16 right-2 sm:right-4 w-56 sm:w-64 max-w-[calc(100vw-1rem)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl py-2 z-50 border border-white/20 dark:border-gray-700/50">
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200/50 dark:border-gray-700/50">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userInfo?.emailid}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300 capitalize">{userInfo?.role} Account</p>
            {userInfo?.role === "user" && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                Tank Access: {userCanViewTanks ? "✓ Enabled" : "✗ No devices assigned"}
              </p>
            )}
          </div>
          {/* <button
            onClick={() => handleNavigation("/myprofile")}
            className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
          >
            <User size={14} className="sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">My Profile</span>
          </button>
          <button
            onClick={() => handleNavigation("/editprofile")}
            className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
          >
            <Edit3 size={14} className="sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">Edit Profile</span>
          </button>
          {userInfo?.role === "admin" && (
            <button
              onClick={() => handleNavigation("/system-monitoring")}
              className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
            >
              <Activity size={14} className="sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
              <span className="truncate">System Monitor</span>
            </button>
          )} */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-1"></div>
          <button
            onClick={handleLogoutClick}
            className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
          >
            <LogOut size={14} className="sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">Logout</span>
          </button>
        </div>
      )}

      {/* Mobile Sidebar Overlay - Made responsive */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={toggleMobileMenu}>
          <div
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl h-full w-72 sm:w-80 max-w-[85vw] shadow-2xl transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <Zap className="mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                  <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                    IoT Dashboard
                  </span>
                </div>
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Mobile Navigation Items - Made responsive */}
            <div className="p-3 sm:p-4 space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
              {filteredSidebarItems.map((item, index) => (
                <button
                  key={index}
                  className={`flex items-center w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl font-semibold transition-all duration-300 group text-left ${
                    isActivePath(item.path)
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-105`
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:scale-105"
                  }`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <span className="mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-sm sm:text-base truncate flex-1">{item.name}</span>
                  {item.alertCount && item.alertCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                      {item.alertCount > 99 ? "99+" : item.alertCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar - No changes needed, already responsive */}
      <div
        className={`hidden lg:block ${
          open ? "w-72" : "w-20"
        } duration-300 h-screen bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl flex-shrink-0`}
      >
        <div
          className={`flex items-center ${
            open ? "justify-between" : "justify-center"
          } p-6 border-b border-gray-200/50 dark:border-gray-700/50`}
        >
          {open && (
            <div className="flex items-center">
              <Zap className="mr-3 text-blue-600 dark:text-blue-400" size={28} />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                IoT Dashboard
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 group"
          >
            {open ? (
              <ChevronLeft
                size={20}
                className="group-hover:scale-110 transition-transform duration-200 text-gray-700 dark:text-gray-300"
              />
            ) : (
              <Menu
                size={24}
                className="group-hover:scale-110 transition-transform duration-200 text-gray-700 dark:text-gray-300"
              />
            )}
          </button>
        </div>
        
        {/* Desktop Navigation Items */}
        <div className="p-4 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
          {filteredSidebarItems.map((item, index) => (
            <button
              key={index}
              className={`flex items-center ${
                open ? "justify-start px-6" : "justify-center px-3"
              } w-full py-4 rounded-2xl font-semibold transition-all duration-300 group relative ${
                isActivePath(item.path)
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-105`
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:scale-105 hover:shadow-md"
              }`}
              onClick={() => handleNavigation(item.path)}
              title={!open ? item.name : undefined}
            >
              <span className="group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
              {open && <span className="ml-4">{item.name}</span>}
              {item.alertCount && item.alertCount > 0 && open && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {item.alertCount > 99 ? "99+" : item.alertCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default ResponsiveNavigation
