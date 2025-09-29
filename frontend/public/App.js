// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import MapPage from './pages/MapPage';
import { Home, HardDrive, BarChart2, Users, Settings, Map } from 'lucide-react';
// import './App.css'; // REMOVE OR COMMENT OUT THIS LINE

export const baseurl = "http://localhost:5000/api"; // Example base URL for your API

function App() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Devices', path: '/devices', icon: HardDrive },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Map', path: '/map', icon: Map },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#1f2025] shadow-lg flex flex-col">
        <div className="p-6 text-2xl font-bold text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700">
          IoT Dashboard
        </div>
        <nav className="flex-grow mt-5">
          <ul>
            {navItems.map((item) => (
              <li key={item.name} className="mb-2">
                <Link
                  to={item.path}
                  className={`flex items-center py-2 px-6 text-lg font-medium rounded-r-full transition-colors duration-200
                    ${location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                >
                  <item.icon size={20} className="mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          <p>&copy; {new Date().getFullYear()} IoT Dashboard. All rights reserved.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;