// import React from 'react';
// import { X } from 'lucide-react';
// import { AllSidebarItems } from '../../constants/sidebarItems'; // Example path

// const MobileSidebar = React.memo(({ toggleMobileMenu, userInfo, location, navigate }) => {
//      const filteredSidebarItems = React.useMemo(() => {
//         return userInfo
//             ? AllSidebarItems.filter(item => item.roles.includes(userInfo.role))
//             : [];
//     }, [userInfo]);

//     return (
//         <div className="md:hidden fixed inset-0 z-40" onClick={toggleMobileMenu}>
//             <div className="bg-gray-50 dark:bg-[#1A1C22] h-full w-60" onClick={(e) => e.stopPropagation()}>
//                 <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
//                     <span className="text-xl font-semibold text-gray-800 dark:text-[#D1D5DB]">Menu</span>
//                     <button onClick={toggleMobileMenu}><X size={24} /></button>
//                 </div>
//                 <div className="mt-6">
//                     {filteredSidebarItems.map((item) => (
//                          <button
//                             key={item.name}
//                             onClick={() => {
//                                 navigate(item.path);
//                                 toggleMobileMenu();
//                             }}
//                             className={`flex items-center w-full py-3 px-4 text-gray-700 dark:text-[#D1D5DB] hover:bg-blue-200 dark:hover:bg-gray-700 font-semibold transition-colors duration-200 justify-start pl-6 ${location.pathname.startsWith(item.path) ? "bg-blue-100 dark:bg-gray-700" : ""}`}
//                         >
//                             {item.icon}
//                             <span className="ml-3">{item.name}</span>
//                         </button>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// });

// export default MobileSidebar;


// 6/19/2025

"use client"

import React from "react"
import { X, Zap } from "lucide-react"
import { AllSidebarItems } from "../../constants/sidebarItems"

const MobileSidebar = React.memo(({ toggleMobileMenu, userInfo, location, navigate }) => {
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
    <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={toggleMobileMenu}>
      <div
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl h-full w-72 shadow-2xl transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enhanced Header */}
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="mr-3 text-blue-600 dark:text-blue-400" size={28} />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                IoT Dashboard
              </span>
            </div>
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 group"
              aria-label="Close menu"
            >
              <X
                size={20}
                className="text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200"
              />
            </button>
          </div>
        </div>

        {/* Enhanced Navigation */}
        <div className="p-4 space-y-2">
          {filteredSidebarItems.map((item, index) => (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.path)
                toggleMobileMenu()
              }}
              className={`flex items-center w-full p-4 rounded-2xl font-semibold transition-all duration-300 group ${
                isActivePath(item.path)
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-105`
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:scale-105"
              }`}
            >
              <span className="mr-4 group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* Enhanced Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.fullName || userInfo?.username}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{userInfo?.role} Account</p>
          </div>
        </div>
      </div>
    </div>
  )
})

MobileSidebar.displayName = "MobileSidebar"

export default MobileSidebar
