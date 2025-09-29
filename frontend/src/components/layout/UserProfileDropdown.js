// // src/components/layout/UserProfileDropdown.js

// import React from 'react';
// import { useNavigate } from 'react-router-dom';

// function UserProfileDropdown({ userInfo, logout, onClose }) {
//   const navigate = useNavigate();

//   const handleNavigate = (path) => {
//     navigate(path);
//     onClose(); // Close the dropdown after navigation
//   };

//   const handleLogout = () => {
//     logout();
//     onClose();
//   };

//   return (
//     <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
//       <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
//         {userInfo ? userInfo.emailid : "Loading..."}
//       </div>
//       <button
//         onClick={() => handleNavigate("/myprofile")}
//         className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
//       >
//         <span className="mr-2">👤</span> My Profile
//       </button>
//       <button
//         onClick={() => handleNavigate("/editprofile")}
//         className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
//       >
//         <span className="mr-2">✏️</span> Edit Profile
//       </button>
//       <div className="border-t border-gray-200 dark:border-gray-700"></div>
//       <button
//         onClick={handleLogout}
//         className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
//       >
//         <span className="mr-2">🚪</span> Logout
//       </button>
//     </div>
//   );
// }

// export default UserProfileDropdown;


// 6/19/2025

"use client"
import { User, Edit3, LogOut, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"

const UserProfileDropdown = ({ userInfo, logout, onClose }) => {
  const navigate = useNavigate()

  const handleNavigation = (path) => {
    navigate(path)
    onClose()
  }

  return (
    <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-2xl py-2 z-50 border border-white/20 dark:border-gray-700/50">
      <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{userInfo?.emailid}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userInfo?.role} Account</p>
      </div>
      <button
        onClick={() => handleNavigation("/myprofile")}
        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
      >
        <User size={16} className="mr-3" />
        My Profile
      </button>
      <button
        onClick={() => handleNavigation("/editprofile")}
        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
      >
        <Edit3 size={16} className="mr-3" />
        Edit Profile
      </button>
      {userInfo?.role === "admin" && (
        <button
          onClick={() => handleNavigation("/settings")}
          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
        >
          <Settings size={16} className="mr-3" />
          Settings
        </button>
      )}
      <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-1"></div>
      <button
        onClick={() => {
          logout()
          onClose()
        }}
        className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
      >
        <LogOut size={16} className="mr-3" />
        Logout
      </button>
    </div>
  )
}

export default UserProfileDropdown
