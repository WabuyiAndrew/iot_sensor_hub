// import React from 'react';
// import { ChevronLeft, Menu } from 'lucide-react';
// // You might need to adjust the path to your icon mapping/constants
// // For now, assuming you have a way to get these icons
// import { AllSidebarItems } from '../../constants/sidebarItems'; // Example path

// // Memoize the component to prevent re-renders when props don't change
// const DesktopSidebar = React.memo(({ open, toggleSidebar, userInfo, location, navigate }) => {
//     const filteredSidebarItems = React.useMemo(() => {
//         return userInfo
//             ? AllSidebarItems.filter(item => item.roles.includes(userInfo.role))
//             : [];
//     }, [userInfo]);

//     return (
//         <div className={`hidden md:block ${open ? "w-60" : "w-20"} duration-300 h-screen bg-gray-50 dark:bg-[#1A1C22] relative border-x-2 dark:border-gray-700`}>
//              <div className={`flex items-center ${open ? "justify-between" : "justify-center"} p-4 border-b dark:border-gray-700`}>
//                 {open && <span className="text-xl font-semibold text-gray-800 dark:text-[#D1D5DB]">IoT Dashboard</span>}
//                 <button onClick={toggleSidebar} className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-gray-700">
//                     {open ? <ChevronLeft size={20} /> : <Menu size={24} />}
//                 </button>
//             </div>
//             <div className="mt-6">
//                 {filteredSidebarItems.map((item) => (
//                     <button
//                         key={item.name}
//                         onClick={() => navigate(item.path)}
//                         className={`flex items-center w-full py-3 px-4 text-gray-700 dark:text-[#D1D5DB] hover:bg-blue-200 dark:hover:bg-gray-700 font-semibold transition-colors duration-200 ${open ? "justify-start pl-6" : "justify-center"} ${location.pathname.startsWith(item.path) ? "bg-blue-100 dark:bg-gray-700" : ""}`}
//                     >
//                         {item.icon}
//                         {open && <span className="ml-3">{item.name}</span>}
//                     </button>
//                 ))}
//             </div>
//         </div>
//     );
// });

// export default DesktopSidebar;


// 6/19/2025
"use client"

import React from "react"
import { ChevronLeft, Menu, Zap } from "lucide-react"
import { AllSidebarItems } from "../../constants/sidebarItems"

const DesktopSidebar = React.memo(({ open, toggleSidebar, userInfo, location, navigate }) => {
  const filteredSidebarItems = React.useMemo(() => {
    return userInfo ? AllSidebarItems.filter((item) => item.roles.includes(userInfo.role)) : []
  }, [userInfo])

  const isActivePath = (itemPath) => {
    const currentPath = location.pathname || ""
    if (itemPath === "/dashboard" && currentPath === "/dashboard") return true
    if (itemPath === "/devices" && currentPath.startsWith("/devices")) return true
    if (itemPath === "/tank-types" && currentPath.startsWith("/tank-types")) return true
    return currentPath === itemPath
  }

  return (
    <div
      className={`hidden md:block ${
        open ? "w-72" : "w-20"
      } duration-300 h-screen bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl`}
    >
      {/* Enhanced Header */}
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
          aria-label="Toggle sidebar"
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

      {/* Enhanced Navigation */}
      <div className="p-4 space-y-3">
        {filteredSidebarItems.map((item, index) => (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            className={`flex items-center ${
              open ? "justify-start px-6" : "justify-center px-3"
            } w-full py-4 rounded-2xl font-semibold transition-all duration-300 group ${
              isActivePath(item.path)
                ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-105`
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:scale-105 hover:shadow-md"
            }`}
            title={!open ? item.name : undefined}
          >
            <span className="group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
            {open && <span className="ml-4">{item.name}</span>}
          </button>
        ))}
      </div>

      {/* Enhanced Footer */}
      {open && userInfo && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/80 to-blue-50/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {userInfo.fullName || userInfo.username}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userInfo.role} Account</p>
          </div>
        </div>
      )}
    </div>
  )
})

DesktopSidebar.displayName = "DesktopSidebar"

export default DesktopSidebar
