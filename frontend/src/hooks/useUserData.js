import { useState, useEffect, useCallback, useRef } from "react";
import { useCookies } from "react-cookie";
import axios from "axios";

// Caching functions to improve performance and prevent re-fetching on every render.
const getCachedUserInfo = () => {
  try {
    const cachedUser = localStorage.getItem("userInfo");
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser);
      const cacheTime = localStorage.getItem("userInfoCacheTime");
      // Invalidate cache after 1 hour to ensure fresh data
      if (cacheTime && Date.now() - Number.parseInt(cacheTime, 10) > 60 * 60 * 1000) {
        localStorage.removeItem("userInfo");
        localStorage.removeItem("userInfoCacheTime");
        return null;
      }
      return parsed;
    }
  } catch (error) {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("userInfoCacheTime");
  }
  return null;
};

const setCachedUserInfo = (userInfo) => {
  try {
    localStorage.setItem("userInfo", JSON.stringify(userInfo));
    localStorage.setItem("userInfoCacheTime", Date.now().toString());
  } catch (error) {
    console.error("Failed to set user info cache:", error);
  }
};

const clearCachedUserInfo = () => {
  try {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("userInfoCacheTime");
  } catch (error) {
    console.error("Failed to clear user info cache:", error);
  }
};

export const useUserData = ({ baseurl, onLogout, nav, location }) => {
  const [cookies, , removeCookie] = useCookies(["token"]);
  const [userInfo, setUserInfo] = useState(() => getCachedUserInfo());
  const [loadingUser, setLoadingUser] = useState(() => !!cookies.token && !getCachedUserInfo());
  const [allDevicesSensorData, setAllDevicesSensorData] = useState({});
  const [userHasTankAccess, setUserHasTankAccess] = useState(false);

  const isFetchingRef = useRef(false);

  const fetchData = useCallback(
    async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      
      console.log("[useUserData] Starting data fetch...");
      
      if (!cookies.token) {
        setLoadingUser(false);
        clearCachedUserInfo();
        setUserInfo(null);
        setAllDevicesSensorData({});
        setUserHasTankAccess(false);
        onLogout();
        isFetchingRef.current = false;
        return;
      }

      try {
        // Step 1: Fetch user profile
        const userProfileResponse = await axios.get(`${baseurl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${cookies.token}` },
          withCredentials: true,
        });
        const userData = userProfileResponse.data.data || userProfileResponse.data;
        setUserInfo(userData);
        setCachedUserInfo(userData);

        // Step 2: Fetch sensor data for all user devices
        let sensorDataRes;
        if (userData.role === "admin") {
          // Admin endpoint returns all latest data
          sensorDataRes = await axios.get(`${baseurl}/api/sensor/latest`, {
            headers: { Authorization: `Bearer ${cookies.token}` },
          });
        } else {
          // User endpoint returns data for their devices
          sensorDataRes = await axios.get(`${baseurl}/api/sensor/latest?limit=50`, {
            headers: { Authorization: `Bearer ${cookies.token}` },
          });
        }
        
        // Step 3: Process the fetched data and determine tank access
        const fetchedDevicesData = sensorDataRes.data?.data || [];

        // ✅ UPDATED LOGIC: Apply conditional filtering based on user role
        let filteredDevicesData = fetchedDevicesData;
        let hasTankAccess = false;

        if (userData.role !== "admin") {
            console.log("[useUserData] Filtering devices for standard user.");
            filteredDevicesData = fetchedDevicesData.filter(sensorReading => {
                // Check if the nested device object exists and is tank-compatible
                return sensorReading.device && sensorReading.device.isTankCompatible;
            });
        }

        // Check for tank access on the final filtered list
        hasTankAccess = filteredDevicesData.some(sensorReading => sensorReading.device?.isTankCompatible);
        
        const dataById = {};
        
        if (Array.isArray(filteredDevicesData)) {
          filteredDevicesData.forEach((sensorReading) => {
            if (sensorReading && sensorReading.deviceId) {
              // Map the sensor reading data for the dashboard views
              dataById[sensorReading.deviceId] = {
                values: sensorReading,
                timestamp: sensorReading.timestamp || new Date().toISOString(),
              };
            }
          });
        }
        
        setAllDevicesSensorData(dataById);
        setUserHasTankAccess(hasTankAccess); // Set state based on the loop result

      } catch (error) {
        console.error("[useUserData] Data fetch error:", error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearCachedUserInfo();
          setUserInfo(null);
          setUserHasTankAccess(false);
          onLogout();
          if (location.pathname !== "/") {
            nav("/");
          }
        }
      } finally {
        setLoadingUser(false);
        isFetchingRef.current = false;
      }
    },
    [cookies.token, baseurl, onLogout, nav, location.pathname]
  );

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // Handle cookie changes (e.g., manual deletion)
  useEffect(() => {
    if (!cookies.token && userInfo) {
      clearCachedUserInfo();
      setUserInfo(null);
      setAllDevicesSensorData({});
      setUserHasTankAccess(false);
    }
  }, [cookies.token, userInfo]);

  return {
    userInfo,
    loadingUser,
    allDevicesSensorData,
    userHasTankAccess,
    fetchData,
    clearCachedUserInfo,
  };
};