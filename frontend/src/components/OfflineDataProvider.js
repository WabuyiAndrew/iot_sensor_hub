import React, { createContext, useContext, useCallback } from 'react';
import { useWebSocket } from '../App';

const OfflineDataContext = createContext(null);

export const useOfflineData = () => {
  const context = useContext(OfflineDataContext);
  if (!context) {
    throw new Error('useOfflineData must be used within an OfflineDataProvider');
  }
  return context;
};

export const OfflineDataProvider = ({ children }) => {
  const { persistentData, getCachedData, isConnected } = useWebSocket();

  // Get sensor data with fallback to cached data
  const getSensorData = useCallback((deviceId) => {
    if (isConnected) {
      // If connected, return live data (you might want to implement live data fetching here)
      return getCachedData('sensor', deviceId);
    }
    // If offline, return cached data
    return getCachedData('sensor', deviceId);
  }, [isConnected, getCachedData]);

  // Get device status with fallback to cached data
  const getDeviceStatus = useCallback((deviceId) => {
    if (isConnected) {
      return getCachedData('device', deviceId);
    }
    return getCachedData('device', deviceId);
  }, [isConnected, getCachedData]);

  // Get tank volume data with fallback to cached data
  const getTankVolumeData = useCallback((tankId) => {
    if (isConnected) {
      return getCachedData('tank', tankId);
    }
    return getCachedData('tank', tankId);
  }, [isConnected, getCachedData]);

  // Get alerts with fallback to cached data
  const getAlerts = useCallback(() => {
    return getCachedData('alerts') || [];
  }, [getCachedData]);

  // Check if data is stale (older than 5 minutes)
  const isDataStale = useCallback((data) => {
    if (!data || !data.lastUpdated) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(data.lastUpdated) < fiveMinutesAgo;
  }, []);

  // Get all available device IDs from cached data
  const getAvailableDeviceIds = useCallback(() => {
    return Object.keys(persistentData.sensorData || {});
  }, [persistentData.sensorData]);

  // Get all available tank IDs from cached data
  const getAvailableTankIds = useCallback(() => {
    return Object.keys(persistentData.tankVolumes || {});
  }, [persistentData.tankVolumes]);

  // Get data freshness indicator
  const getDataFreshness = useCallback((data) => {
    if (!data || !data.lastUpdated) return 'unknown';
    
    const now = new Date();
    const dataTime = new Date(data.lastUpdated);
    const diffMinutes = (now - dataTime) / (1000 * 60);
    
    if (diffMinutes < 1) return 'fresh';
    if (diffMinutes < 5) return 'recent';
    if (diffMinutes < 30) return 'stale';
    return 'old';
  }, []);

  const contextValue = {
    // Data getters
    getSensorData,
    getDeviceStatus,
    getTankVolumeData,
    getAlerts,
    
    // Utility functions
    isDataStale,
    getDataFreshness,
    getAvailableDeviceIds,
    getAvailableTankIds,
    
    // Connection status
    isConnected,
    
    // Raw persistent data
    persistentData,
  };

  return (
    <OfflineDataContext.Provider value={contextValue}>
      {children}
    </OfflineDataContext.Provider>
  );
};