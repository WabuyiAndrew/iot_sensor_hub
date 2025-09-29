// import { useState, useEffect, useCallback, useRef } from 'react';
// import axios from 'axios';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// // Create axios instance with default config
// const createApiClient = (token = null) => {
//   const client = axios.create({
//     baseURL: API_BASE_URL,
//     timeout: 15000,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(token && { 'Authorization': `Bearer ${token}` })
//     },
//   });

//   // Add response interceptor for error handling
//   client.interceptors.response.use(
//     (response) => response,
//     (error) => {
//       if (error.response?.status === 401) {
//         console.warn('Authentication failed - token may be expired');
//         // Clear token from localStorage if it exists
//         localStorage.removeItem('authToken');
//       }
//       return Promise.reject(error);
//     }
//   );

//   return client;
// };

// export const useDashboardAPI = (options = {}) => {
//   const {
//     refreshInterval = 30000, // 30 seconds
//     enableAutoRefresh = true,
//     onError = null,
//     authToken = null,
//   } = options;

//   // State management
//   const [data, setData] = useState({
//     users: [],
//     devices: [],
//     sensorData: [],
//     deviceStatus: {},
//     stats: {
//       totalUsers: 0,
//       totalDevices: 0,
//       activeDevices: 0,
//       offlineDevices: 0,
//       totalAlerts: 0,
//     }
//   });
  
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [lastUpdate, setLastUpdate] = useState(null);
  
//   // Refs for managing requests
//   const abortControllerRef = useRef(null);
//   const requestInProgressRef = useRef(false);
//   const intervalRef = useRef(null);

//   // Get auth token from localStorage or props
//   const getAuthToken = useCallback(() => {
//     return authToken || localStorage.getItem('authToken') || null;
//   }, [authToken]);

//   // Create API client with current token
//   const getApiClient = useCallback(() => {
//     const token = getAuthToken();
//     return createApiClient(token);
//   }, [getAuthToken]);

//   // Fetch users data with error handling
//   const fetchUsers = useCallback(async (apiClient, signal) => {
//     try {
//       const response = await apiClient.get('/api/users', { signal });
//       return Array.isArray(response.data) ? response.data : (response.data?.users || []);
//     } catch (err) {
//       if (err.name === 'AbortError') throw err;
//       console.warn('Error fetching users:', err.message);
//       return [];
//     }
//   }, []);

//   // Fetch devices data with error handling
//   const fetchDevices = useCallback(async (apiClient, signal) => {
//     try {
//       const response = await apiClient.get('/api/devices', { signal });
//       return Array.isArray(response.data) ? response.data : (response.data?.devices || []);
//     } catch (err) {
//       if (err.name === 'AbortError') throw err;
//       console.warn('Error fetching devices:', err.message);
//       return [];
//     }
//   }, []);

//   // Fetch sensor data with error handling
//   const fetchSensorData = useCallback(async (apiClient, signal) => {
//     try {
//       const response = await apiClient.get('/api/sensor/sensor-data', { signal });
//       return Array.isArray(response.data) ? response.data : (response.data?.data || []);
//     } catch (err) {
//       if (err.name === 'AbortError') throw err;
//       console.warn('Error fetching sensor data:', err.message);
//       return [];
//     }
//   }, []);

//   // Fetch device status with error handling
//   const fetchDeviceStatus = useCallback(async (apiClient, signal) => {
//     try {
//       const response = await apiClient.get('/api/devices/status', { signal });
//       return response.data || {};
//     } catch (err) {
//       if (err.name === 'AbortError') throw err;
//       console.warn('Error fetching device status:', err.message);
//       return {};
//     }
//   }, []);

//   // Main data fetching function with proper error handling and request management
//   const fetchAllData = useCallback(async () => {
//     // Prevent multiple simultaneous requests
//     if (requestInProgressRef.current) {
//       console.log('Request already in progress, skipping...');
//       return;
//     }

//     // Check if we have an auth token
//     const token = getAuthToken();
//     if (!token) {
//       setError('No authentication token available');
//       setLoading(false);
//       return;
//     }

//     requestInProgressRef.current = true;
//     setLoading(true);
//     setError(null);

//     // Cancel any existing request
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//     }

//     // Create new abort controller
//     abortControllerRef.current = new AbortController();
//     const { signal } = abortControllerRef.current;

//     try {
//       const apiClient = getApiClient();

//       // Fetch data sequentially to avoid overwhelming the server
//       console.log('Fetching dashboard data...');
      
//       const users = await fetchUsers(apiClient, signal);
//       if (signal.aborted) return;

//       const devices = await fetchDevices(apiClient, signal);
//       if (signal.aborted) return;

//       const sensors = await fetchSensorData(apiClient, signal);
//       if (signal.aborted) return;

//       const status = await fetchDeviceStatus(apiClient, signal);
//       if (signal.aborted) return;

//       // Calculate stats
//       const totalUsers = users.length;
//       const totalDevices = devices.length;
      
//       let activeDevices = 0;
//       let offlineDevices = 0;
      
//       devices.forEach(device => {
//         if (device.isActive || device.status === 'online' || device.status === 'active') {
//           activeDevices++;
//         } else {
//           offlineDevices++;
//         }
//       });

//       const newData = {
//         users,
//         devices,
//         sensorData: sensors,
//         deviceStatus: status,
//         stats: {
//           totalUsers,
//           totalDevices,
//           activeDevices,
//           offlineDevices,
//           totalAlerts: sensors.filter(s => s.alert || s.severity).length || 0,
//         }
//       };

//       setData(newData);
//       setLastUpdate(new Date());
//       setError(null);
//       console.log('Dashboard data updated successfully');

//       return newData;
//     } catch (err) {
//       if (err.name === 'AbortError') {
//         console.log('Request was aborted');
//         return;
//       }

//       const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch dashboard data';
//       console.error('Dashboard API Error:', errorMessage);
//       setError(errorMessage);
      
//       if (onError) {
//         onError(err);
//       }
//     } finally {
//       setLoading(false);
//       requestInProgressRef.current = false;
//     }
//   }, [getAuthToken, getApiClient, fetchUsers, fetchDevices, fetchSensorData, fetchDeviceStatus, onError]);

//   // Manual refresh function
//   const refresh = useCallback(async () => {
//     console.log('Manual refresh requested');
//     return await fetchAllData();
//   }, [fetchAllData]);

//   // Setup auto-refresh with proper cleanup
//   useEffect(() => {
//     // Clear any existing interval
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//     }

//     // Initial load
//     fetchAllData();

//     // Set up auto-refresh if enabled
//     if (enableAutoRefresh && refreshInterval > 0) {
//       intervalRef.current = setInterval(() => {
//         fetchAllData();
//       }, refreshInterval);
//     }

//     return () => {
//       // Cleanup on unmount
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//       }
//       if (abortControllerRef.current) {
//         abortControllerRef.current.abort();
//       }
//     };
//   }, [fetchAllData, enableAutoRefresh, refreshInterval]);

//   return {
//     data,
//     loading,
//     error,
//     lastUpdate,
//     refresh,
//     // Individual fetch functions for manual use
//     fetchUsers: (signal) => fetchUsers(getApiClient(), signal),
//     fetchDevices: (signal) => fetchDevices(getApiClient(), signal),
//     fetchSensorData: (signal) => fetchSensorData(getApiClient(), signal),
//     fetchDeviceStatus: (signal) => fetchDeviceStatus(getApiClient(), signal),
//   };
// };

// // Hook for real-time sensor data with proper throttling
// export const useRealtimeSensorData = (deviceId = null, options = {}) => {
//   const {
//     pollInterval = 10000, // 10 seconds to avoid rate limiting
//     enabled = true,
//     authToken = null,
//   } = options;

//   const [sensorData, setSensorData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
  
//   const abortControllerRef = useRef(null);
//   const requestInProgressRef = useRef(false);

//   const getAuthToken = useCallback(() => {
//     return authToken || localStorage.getItem('authToken') || null;
//   }, [authToken]);

//   const fetchData = useCallback(async () => {
//     if (!enabled || requestInProgressRef.current) return;

//     const token = getAuthToken();
//     if (!token) {
//       setError('No authentication token available');
//       return;
//     }

//     requestInProgressRef.current = true;
//     setLoading(true);

//     // Cancel any existing request
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//     }

//     abortControllerRef.current = new AbortController();
//     const { signal } = abortControllerRef.current;

//     try {
//       const apiClient = createApiClient(token);
//       const url = deviceId 
//         ? `/api/sensor/sensor-data?deviceId=${deviceId}`
//         : '/api/sensor/sensor-data';
      
//       const response = await apiClient.get(url, { signal });
//       const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      
//       setSensorData(data);
//       setError(null);
//     } catch (err) {
//       if (err.name === 'AbortError') return;
      
//       const errorMessage = err.response?.data?.message || err.message;
//       console.warn('Error fetching sensor data:', errorMessage);
//       setError(errorMessage);
//     } finally {
//       setLoading(false);
//       requestInProgressRef.current = false;
//     }
//   }, [deviceId, enabled, getAuthToken]);

//   useEffect(() => {
//     if (!enabled) return;

//     fetchData();
    
//     const interval = setInterval(fetchData, pollInterval);
    
//     return () => {
//       clearInterval(interval);
//       if (abortControllerRef.current) {
//         abortControllerRef.current.abort();
//       }
//     };
//   }, [fetchData, pollInterval, enabled]);

//   return {
//     data: sensorData,
//     loading,
//     error,
//     refresh: fetchData,
//   };
// };