"use client"

import { BrowserRouter } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import { Route, Routes, useLocation } from "react-router-dom"
import { CookiesProvider } from "react-cookie"
import { Toaster } from "react-hot-toast"

// Context Providers
import { PageContextProvider } from "./store/PageContext.js"
import { AuthProvider } from "./contexts/AuthContext"
import { WebSocketProvider } from "./contexts/WebSocketContext.js"
import { ToastProvider } from "./hooks/use-toast"
import { useAuth } from "./contexts/AuthContext.js"
import { useWebSocket } from "./contexts/WebSocketContext.js"
import { GlobalAlertsProvider } from "./contexts/GlobalAlertsContext"

// Components
import LandingPage from "./components/LandingPage.js"
import Login from "./components/Login.js"
import ResetPassword from "./components/ResetPassword.js"
import BlogPost from "./components/BlogPost.tsx"
import BlogListing from "./components/BlogListing.tsx"
import BlogAdminPage from "./components/BlogAdminPage.tsx"
import HomePage from "./components/HomePage.js"
import ConnectionStatus from "./components/ConnectionStatus"

// Pages
import DashboardPage from "./components/Content/Dashboard.js"
import DevicesPage from "./pages/DevicesPage.js"
import UsersPage from "./pages/UsersPage.js"
import MapPage from "./pages/MapPage.js"
import MyDashboardPage from "./pages/MyDashboardPage.js"
import DeviceDetailsPage from "./pages/DeviceDetailsPage.js"
// import MyProfile from "./components/Content/MyProfile.js"
// import EditProfile from "./components/Content/EditProfile.js"
import ChangePassword from "./components/Content/ChangePassword.js"
import TankTypeManagementPage from "./pages/TankTypeManagementPage.js"
import TankDetailsPage from "./pages/TankDetailsPage.js"
import AlertsPage from "./pages/AlertsPage.js"
// import SystemMonitoringPage from "./pages/SystemMonitoringPage.js"

// The baseurl is no longer needed here as it's managed by AuthContext.
// export const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5050"

function RoutesWithAnimation() {
  const location = useLocation()
  const { connectionStatus, manualReconnect } = useWebSocket()
  const { isSystemHealthy } = useAuth()

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.key}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/blog" element={<BlogListing />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes - HomePage now acts as a Layout */}
          <Route element={<HomePage />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin/blog" element={<BlogAdminPage />} />
            <Route path="/my-dashboard" element={<MyDashboardPage />} />
            <Route path="/devices/:deviceId" element={<DeviceDetailsPage />} />
            <Route path="/map" element={<MapPage />} />
            {/* <Route path="/myprofile" element={<MyProfile />} /> */}
            {/* <Route path="/editprofile" element={<EditProfile />} /> */}
            <Route path="/changepassword" element={<ChangePassword />} />
            <Route path="/tanks" element={<TankTypeManagementPage />} />
            <Route path="/tank-details/:tankId" element={<TankDetailsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            {/* <Route path="/system-monitoring" element={<SystemMonitoringPage />} /> */}
          </Route>

          {/* Enhanced 404 Page */}
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
                <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                  <h1 className="text-8xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-4">
                    404
                  </h1>
                  <h2 className="text-3xl font-semibold text-gray-800 dark:text-white mb-4">Page Not Found</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md">
                    The page you're looking for doesn't exist or has been moved.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => window.history.back()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => (window.location.href = "/")}
                      className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Home
                    </button>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
      </AnimatePresence>

      {/* Enhanced Toast Configuration */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
            borderRadius: "12px",
            padding: "16px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          },
          success: {
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
            style: {
              background: "linear-gradient(135deg, #10B981, #059669)",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
            style: {
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
            },
          },
          loading: {
            iconTheme: {
              primary: "#3B82F6",
              secondary: "#fff",
            },
            style: {
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
            },
          },
        }}
      />

      <ConnectionStatus connectionStatus={connectionStatus} onReconnect={manualReconnect} />
    </>
  )
}

function App() {
  return (
    <PageContextProvider>
      <BrowserRouter>
        <CookiesProvider>
          <AuthProvider>
            <WebSocketProvider>
              <GlobalAlertsProvider>
                <ToastProvider>
                  <RoutesWithAnimation />
                </ToastProvider>
              </GlobalAlertsProvider>
            </WebSocketProvider>
          </AuthProvider>
        </CookiesProvider>
      </BrowserRouter>
    </PageContextProvider>
  )
}

export default App
