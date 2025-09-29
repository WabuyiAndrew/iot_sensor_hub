// // components/layout/TopNavbar.jsx
// import { useState, useMemo, useCallback } from 'react';
// import { UserCircle, Sun, Moon, Search } from 'lucide-react';
// import debounce from 'lodash.debounce';

// // You would create similar dropdown components for reusability
// import UserProfileDropdown from './UserProfileDropdown'; 

// function TopNavbar({ toggleDarkMode, darkMode, userInfo, logout, setGlobalSearchTerm, children }) {
//     const [dropdownOpen, setDropdownOpen] = useState(false);
//     // --- PERFORMANCE: Local state for immediate input feedback ---
//     const [localSearch, setLocalSearch] = useState('');

//     // Debounce the global state update. This prevents all listening components
//     // from re-rendering on every keystroke.
//     const debouncedSetGlobalSearch = useMemo(
//         () => debounce((value) => setGlobalSearchTerm(value), 300),
//         [setGlobalSearchTerm]
//     );

//     const handleSearchChange = useCallback((e) => {
//         setLocalSearch(e.target.value); // Update local state instantly
//         debouncedSetGlobalSearch(e.target.value); // Update global state after a delay
//     }, [debouncedSetGlobalSearch]);

//     const toggleDropdown = useCallback(() => setDropdownOpen(prev => !prev), []);

//     return (
//         <nav className="hidden md:flex bg-blue-600 dark:bg-[#23262E] text-white dark:text-gray-100 p-4 justify-between items-center shadow-md">
//             <div className="flex-1 max-w-3xl">
//                 <div className="relative">
//                     <input
//                         type="search"
//                         placeholder="Search..."
//                         value={localSearch}
//                         onChange={handleSearchChange}
//                         className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-blue-200 dark:placeholder-gray-400 rounded-lg py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-gray-500"
//                     />
//                     <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-200 dark:text-gray-400" aria-label="Search">
//                         <Search size={18} />
//                     </button>
//                 </div>
//             </div>
//             <div className="flex items-center space-x-4">
//                 {children} {/* For AlertBellDropdown */}
//                 <button
//                     onClick={toggleDarkMode}
//                     className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-gray-600"
//                     aria-label="Toggle dark mode"
//                 >
//                     {darkMode ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-gray-900" />}
//                 </button>
//                 <div className="relative">
//                     <button onClick={toggleDropdown} className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-gray-700">
//                         <UserCircle size={24} className="text-gray-900 dark:text-white" />
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
//         </nav>
//     );
// }

// export default TopNavbar;


// 6/19/2025

"use client"

import { useState, useMemo, useCallback } from "react"
import { UserCircle, Sun, Moon, Search, X } from "lucide-react"
import debounce from "lodash.debounce"
import UserProfileDropdown from "./UserProfileDropdown"

function TopNavbar({ toggleDarkMode, darkMode, userInfo, logout, setGlobalSearchTerm, children }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [localSearch, setLocalSearch] = useState("")

  // Debounce the global state update
  const debouncedSetGlobalSearch = useMemo(
    () => debounce((value) => setGlobalSearchTerm(value), 300),
    [setGlobalSearchTerm],
  )

  const handleSearchChange = useCallback(
    (e) => {
      setLocalSearch(e.target.value)
      debouncedSetGlobalSearch(e.target.value)
    },
    [debouncedSetGlobalSearch],
  )

  const clearSearch = useCallback(() => {
    setLocalSearch("")
    setGlobalSearchTerm("")
  }, [setGlobalSearchTerm])

  const toggleDropdown = useCallback(() => setDropdownOpen((prev) => !prev), [])

  return (
    <nav className="hidden md:flex bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900 text-white p-4 shadow-xl">
      {/* Enhanced Search Bar */}
      <div className="flex-1 max-w-2xl mr-6">
        <div className="relative group">
          <div className={`relative transition-all duration-300 ${searchFocused ? "scale-105" : ""}`}>
            <input
              type="search"
              placeholder="Search devices, users, analytics..."
              value={localSearch}
              onChange={handleSearchChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/70 rounded-2xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all duration-300 border border-white/20"
              aria-label="Search"
            />
            <Search
              size={20}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 group-hover:text-white transition-colors duration-200"
            />
            {localSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchFocused && localSearch && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50">
              <p className="text-sm text-gray-600 dark:text-gray-400">Press Enter to search for "{localSearch}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="flex items-center space-x-4">
        {children} {/* For AlertBellDropdown */}
        {/* Enhanced Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm group"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun size={20} className="text-yellow-300 group-hover:scale-110 transition-transform duration-200" />
          ) : (
            <Moon size={20} className="text-blue-200 group-hover:scale-110 transition-transform duration-200" />
          )}
        </button>
        {/* Enhanced User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm group"
            aria-label="User menu"
          >
            <UserCircle size={24} className="group-hover:scale-110 transition-transform duration-200" />
          </button>
          {dropdownOpen && (
            <UserProfileDropdown userInfo={userInfo} logout={logout} onClose={() => setDropdownOpen(false)} />
          )}
        </div>
      </div>
    </nav>
  )
}

export default TopNavbar
