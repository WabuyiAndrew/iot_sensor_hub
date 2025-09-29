// src/hooks/useUserTankAccess.js
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { baseurl } from "../App"; // Assuming baseurl is exported from App.js

export const useUserTankAccess = (userInfo) => {
  const { isAuthenticated, axiosInstance } = useAuth();
  const [userCanViewTanks, setUserCanViewTanks] = useState(false);
  const [tankAccessLoading, setTankAccessLoading] = useState(false);

  // Helper function to determine if a device type implies tank compatibility
  const isDeviceTypeTankCompatible = useCallback((deviceType) => {
    const tankCompatibleDeviceTypes = [
      "ultrasonic_level_sensor", "pressure_transmitter", "radar_level_sensor",
      "submersible_level_sensor", "guided_wave_radar", "laser_level_sensor",
      "capacitive_level_sensor", "float_switch", "vibrating_fork", "load_cell",
      "liquid_level", // Legacy support.
      "multi_sensor", // Multi-sensor can also be tank-compatible
    ];
    return deviceType && tankCompatibleDeviceTypes.includes(deviceType.toLowerCase());
  }, []);

  const checkTankAccess = useCallback(async () => {
    if (!isAuthenticated || !userInfo) {
      setUserCanViewTanks(false);
      return;
    }

    if (userInfo.role === "admin") {
      setUserCanViewTanks(true);
      return;
    }

    setTankAccessLoading(true);
    try {
      // Query backend for accessible tanks
      const response = await axiosInstance.get(`${baseurl}/api/tank-types/user/accessible`);

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // User has access if they have at least one accessible tank
        setUserCanViewTanks(response.data.data.length > 0);
        console.log(`[useUserTankAccess] User ${userInfo.username} tank access via API: ${response.data.data.length > 0}`);
      } else {
        // Fallback: If API call fails or returns unexpected data,
        // check if any of the user's assigned devices are marked as tank compatible
        // or if their type is generally tank compatible.
        const hasCompatibleDevice = userInfo.devices.some(device => {
          // Prefer the explicit backend flag `isTankCompatible` if available
          if (typeof device.isTankCompatible === 'boolean') {
            return device.isTankCompatible;
          }
          // Fallback to type inference if flag not available (e.g., older device data)
          return isDeviceTypeTankCompatible(device.type);
        });
        setUserCanViewTanks(hasCompatibleDevice);
        console.log(`[useUserTankAccess] User ${userInfo.username} tank access via device compatibility fallback: ${hasCompatibleDevice}`);
      }
    } catch (error) {
      console.error("[useUserTankAccess] Error checking tank access:", error);
      // Even if API fails, try to determine from cached user info's devices
      const hasCompatibleDevice = userInfo.devices.some(device => {
        if (typeof device.isTankCompatible === 'boolean') {
          return device.isTankCompatible;
        }
        return isDeviceTypeTankCompatible(device.type);
      });
      setUserCanViewTanks(hasCompatibleDevice);
    } finally {
      setTankAccessLoading(false);
    }
  }, [isAuthenticated, userInfo, axiosInstance, isDeviceTypeTankCompatible, baseurl]);

  useEffect(() => {
    checkTankAccess();
  }, [checkTankAccess]); // Re-run when checkTankAccess callback changes

  return { userCanViewTanks, tankAccessLoading };
};