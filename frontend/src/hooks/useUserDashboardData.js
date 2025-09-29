// src/hooks/useUserDashboardData.js
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useWebSocket } from "../App"; // Import useWebSocket

export const useUserDashboardData = () => {
  const { user, isAuthenticated, loadingAuth, axiosInstance, logout } = useAuth();
  const { ws, isConnected } = useWebSocket(); // Get WebSocket context
  const navigate = useNavigate();
  const location = useLocation();

  const [userInfo, setUserInfo] = useState(null);
  const [allDevicesSensorData, setAllDevicesSensorData] = useState({});
  const [loadingDashboardData, setLoadingDashboardData] = useState(true);

  const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  const fetchInitialDashboardData = useCallback(async () => {
    if (!isAuthenticated || loadingAuth || !user) {
      setLoadingDashboardData(false);
      return;
    }

    setLoadingDashboardData(true);
    try {
      // Set userInfo from AuthContext's user state
      setUserInfo(user);

      let sensorDataRes;
      if (user.role === "admin") {
        sensorDataRes = await axiosInstance.get(`${baseurl}/api/devices/all-sensor-data`);
      } else {
        sensorDataRes = await axiosInstance.get(`${baseurl}/api/devices/sensor-data/my-devices`);
      }

      const dataById = {};
      if (sensorDataRes.data && Array.isArray(sensorDataRes.data.devices)) {
        sensorDataRes.data.devices.forEach((dev) => {
          if (dev && dev._id && dev.data) {
            dataById[dev._id] = { values: dev.data, timestamp: dev.timestamp || new Date().toISOString() };
          }
        });
      }
      setAllDevicesSensorData(dataById);

    } catch (error) {
      console.error("[useUserDashboardData] Error fetching initial dashboard data:", error);
      setAllDevicesSensorData({});
      // AuthContext interceptor should handle 401/403, but a fallback here is good
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout(); // Trigger AuthContext logout
        if (location.pathname !== "/login" && location.pathname !== "/register" && location.pathname !== "/") {
          navigate("/");
        }
      } else {
        toast.error("Failed to load dashboard data.");
      }
    } finally {
      setLoadingDashboardData(false);
    }
  }, [isAuthenticated, loadingAuth, user, axiosInstance, logout, navigate, location.pathname, baseurl]);

  // Fetch initial data when auth state or user changes
  useEffect(() => {
    if (isAuthenticated && user && !loadingAuth) {
      fetchInitialDashboardData();
    }
  }, [isAuthenticated, user, loadingAuth, fetchInitialDashboardData]);


  // WebSocket listener for real-time sensor data updates
  useEffect(() => {
    if (isConnected && ws) {
      const handleWsMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "sensor-data" && data.payload && data.payload.deviceId) {
            // Update allDevicesSensorData with real-time readings
            setAllDevicesSensorData(prevData => {
              const updatedData = {
                ...prevData,
                [data.payload.deviceId]: {
                  values: data.payload, // The payload contains all sensor readings
                  timestamp: data.payload.timestamp || new Date().toISOString(),
                },
              };
              return updatedData;
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message in useUserDashboardData:", error);
        }
      };

      ws.addEventListener("message", handleWsMessage);

      // Clean up event listener
      return () => {
        ws.removeEventListener("message", handleWsMessage);
      };
    }
  }, [isConnected, ws]); // Only re-run if WebSocket connection changes

  return { userInfo, allDevicesSensorData, loadingDashboardData, setAllDevicesSensorData };
};