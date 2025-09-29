// import React from 'react';
// import { Menu, X } from 'lucide-react';
// import UserProfileDropdown from './UserProfileDropdown'; // This should now resolve correctly

// const MobileHeader = React.memo(({ toggleMobileMenu, mobileMenuOpen, toggleDarkMode, darkMode, userInfo, logout, children }) => {
//     const [dropdownOpen, setDropdownOpen] = React.useState(false);

//     return (
//         <div className="md:hidden bg-blue-600 dark:bg-gray-900 text-white p-4 flex justify-between items-center">
//             <button onClick={toggleMobileMenu} className="mr-4">
//                 {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
//             </button>
//             <span className="text-xl font-semibold">IoT Dashboard</span>
//             <div className="flex items-center space-x-2">
//                 {children} {/* For AlertBellDropdown */}
//                 <div className="relative">
//                      <button onClick={() => setDropdownOpen(p => !p)} className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-gray-700">
//                         {/* User Icon Here */}
//                     </button>
//                     {dropdownOpen && (
//                         <UserProfileDropdown 
//                             userInfo={userInfo} 
//                             logout={logout} 
//                             onClose={() => setDropdownOpen(false)} 
//                         />
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// });

// export default MobileHeader;


// 6/19/2025

"use client"

import React from "react"
import { Menu, X, Zap, UserCircle, Sun, Moon } from "lucide-react"
import UserProfileDropdown from "./UserProfileDropdown"

const MobileHeader = React.memo(
  ({ toggleMobileMenu, mobileMenuOpen, toggleDarkMode, darkMode, userInfo, logout, children }) => {
    const [dropdownOpen, setDropdownOpen] = React.useState(false)

    return (
      <div className="md:hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900 text-white p-4 shadow-xl">
        <div className="flex justify-between items-center">
          {/* Left Side - Menu Button and Logo */}
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="mr-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X size={24} className="transform rotate-180 transition-transform duration-300" />
              ) : (
                <Menu size={24} className="transform transition-transform duration-300" />
              )}
            </button>
            <div className="flex items-center">
              <Zap className="mr-2 text-yellow-300" size={24} />
              <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                IoT Dashboard
              </span>
            </div>
          </div>

          {/* Right Side - Controls */}
          <div className="flex items-center space-x-3">
            {children} {/* For AlertBellDropdown */}
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-blue-200" />}
            </button>
            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((p) => !p)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                aria-label="User menu"
              >
                <UserCircle size={24} />
              </button>
              {dropdownOpen && (
                <UserProfileDropdown userInfo={userInfo} logout={logout} onClose={() => setDropdownOpen(false)} />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  },
)

MobileHeader.displayName = "MobileHeader"

export default MobileHeader
