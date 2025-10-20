import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { Link } from 'react-router-dom';
import {
  UserCircle,
  HardDrive,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Edit,
  Eye,
  Battery,
  Wifi,
  WifiOff,
  Calendar,
  Settings,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

function MyDashboardPage() {
  const [cookies] = useCookies(['token']);
  const [userInfo, setUserInfo] = useState(null);
  const [myDevices, setMyDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const baseurl = process.env.REACT_APP_BASE_URL || 'http://localhost:5050';

  const dataRef = useRef({
    devices: [],
    stats: { total: 0, active: 0, inactive: 0, maintenance: 0, lowBattery: 0 },
    alerts: [],
    lastUpdated: new Date(),
  });

  const [wsConnected, setWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const wsRef = useRef(null);

  // Enhanced state for new features
  const [deviceStats, setDeviceStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    maintenance: 0,
    lowBattery: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [systemHealth, setSystemHealth] = useState({ status: 'Unknown' });
  const [isHealthy, setIsHealthy] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);
  const [isUnhealthy, setIsUnhealthy] = useState(false);

  // Dark Mode Logic
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);
  const [circuitBreakerOpenTime, setCircuitBreakerOpenTime] = useState(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  // Enhanced WebSocket connection with proper user device filtering
  const connectWebSocket = useCallback(() => {
    if (circuitBreakerOpen) {
      const now = Date.now();
      const timeSinceOpen = now - circuitBreakerOpenTime;
      if (timeSinceOpen < 300000) {
        // 5 minutes
        console.log('Circuit breaker open, blocking connection attempt');
        setConnectionStatus('Connection Blocked - Too Many Failures');
        return;
      } else {
        console.log('Circuit breaker half-open, allowing test connection');
        setCircuitBreakerOpen(false);
        setCircuitBreakerOpenTime(null);
      }
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:5050';
    console.log('Connecting to WebSocket:', wsUrl);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        setConnectionStatus('Live Data');
        setConsecutiveFailures(0);

        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN && cookies.token) {
            console.log('Sending authentication message');
            wsRef.current.send(
              JSON.stringify({
                type: 'auth',
                token: cookies.token,
                userId: userInfo?._id, // Send user ID for device filtering
              }),
            );
          }
        }, 500);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data.type);

          if (data.type === 'auth-success') {
            console.log('WebSocket authentication successful');
            setConnectionStatus('Live Data - Authenticated');
            setConsecutiveFailures(0);
          } else if (data.type === 'auth-timeout' || data.type === 'auth-failed') {
            console.log('WebSocket authentication failed:', data.type);
            setConnectionStatus('Authentication Failed');
            setConsecutiveFailures((prev) => {
              const newCount = prev + 1;
              if (newCount >= 5) {
                setCircuitBreakerOpen(true);
                setCircuitBreakerOpenTime(Date.now());
                console.log('Circuit breaker opened due to consecutive failures');
                return 0;
              }
              return newCount;
            });

            if (!circuitBreakerOpen) {
              setTimeout(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN && cookies.token) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'auth',
                      token: cookies.token,
                      userId: userInfo?._id,
                    }),
                  );
                }
              }, 5000);
            }
          } else if (data.type === 'deviceUpdate') {
            // Filter devices for current user only
            const userDeviceIds = userInfo?.devices?.map((d) => d._id || d.id || d) || [];
            const userDevices = (data.devices || []).filter((device) =>
              userDeviceIds.includes(device._id || device.id)
            );
            dataRef.current.devices = userDevices;
            updateDeviceStatsBackground();
          } else if (data.type === 'systemHealth') {
            setSystemHealth(data.health);
            setIsHealthy(data.health?.status === 'healthy');
            setIsDegraded(data.health?.status === 'degraded');
            setIsUnhealthy(data.health?.status === 'unhealthy');
          } else if (data.type === 'alert') {
            // Only add alerts for user's devices
            const userDeviceIds = userInfo?.devices?.map((d) => d._id || d.id || d) || [];
            if (userDeviceIds.includes(data.alert.deviceId)) {
              dataRef.current.alerts.unshift(data.alert);
              dataRef.current.alerts = dataRef.current.alerts.slice(0, 5);
            }
          }

          dataRef.current.lastUpdated = new Date();
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        setConnectionStatus('Using Cached Data');

        setConsecutiveFailures((prev) => {
          const newCount = prev + 1;
          if (newCount >= 5) {
            setCircuitBreakerOpen(true);
            setCircuitBreakerOpenTime(Date.now());
            console.log('Circuit breaker opened due to consecutive failures');
            return 0;
          }
          return newCount;
        });

        if (!circuitBreakerOpen) {
          const reconnectDelay = Math.min(10000 * Math.pow(2, reconnectAttempts), 60000);
          setTimeout(() => {
            if (cookies.token && reconnectAttempts < 3) {
              setReconnectAttempts((prev) => prev + 1);
              connectWebSocket();
            }
          }, reconnectDelay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Connection Error');
        setConsecutiveFailures((prev) => prev + 1);
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setConnectionStatus('Connection Failed');
      setConsecutiveFailures((prev) => prev + 1);
    }
  }, [cookies.token, reconnectAttempts, circuitBreakerOpen, circuitBreakerOpenTime, userInfo]);

  const updateDeviceStatsBackground = useCallback(() => {
    const devices = dataRef.current.devices;
    const activeDevices = devices.filter((device) => device.isActive || device.status === 'active').length;
    const maintenanceDevices = devices.filter((device) => device.status === 'maintenance').length;
    const lowBatteryDevices = devices.filter((device) => {
      const batteryLevel = device.batteryLevel || device.battery;
      return batteryLevel && batteryLevel < 20;
    }).length;

    const stats = {
      total: devices.length,
      active: activeDevices,
      inactive: devices.length - activeDevices - maintenanceDevices,
      maintenance: maintenanceDevices,
      lowBattery: lowBatteryDevices,
    };

    dataRef.current.stats = stats;

    const now = Date.now();
    if (!updateDeviceStatsBackground.lastUIUpdate || now - updateDeviceStatsBackground.lastUIUpdate > 30000) {
      setDeviceStats(stats);
      setMyDevices([...devices]);
      setRecentAlerts([...dataRef.current.alerts]);
      setLastUpdated(new Date(dataRef.current.lastUpdated));
      updateDeviceStatsBackground.lastUIUpdate = now;
    }
  }, []);

  // Enhanced fetch function with proper user device filtering
  const fetchData = useCallback(
    async (showRefreshToast = false) => {
      if (!cookies.token) {
        setError('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      if (!refreshing) setLoading(true);
      setRefreshing(true);
      setError(null);

      try {
        console.log('Fetching user profile and assigned devices...');

        // Fetch user profile with proper error handling
        const userRes = await axios.get(`${baseurl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${cookies.token}` },
          timeout: 60000,
        });

        console.log('User profile response:', userRes.data);
        const userData = userRes.data.data || userRes.data;
        setUserInfo(userData);

        // Fetch ONLY user's assigned devices with enhanced filtering
        let userDevices = [];

        if (userData.devices && Array.isArray(userData.devices) && userData.devices.length > 0) {
          try {
            // Method 1: Try the specific my-devices endpoint
            try {
              const myDevicesRes = await axios.get(`${baseurl}/api/devices/my-devices`, {
                headers: { Authorization: `Bearer ${cookies.token}` },
                timeout: 60000,
              });
              userDevices = myDevicesRes.data?.data || myDevicesRes.data || [];
              console.log('Fetched from my-devices endpoint:', userDevices);
            } catch (myDevicesErr) {
              console.warn('my-devices endpoint failed, trying alternative approach...');

              // Method 2: Fetch all devices and filter by user's assigned devices
              const allDevicesRes = await axios.get(`${baseurl}/api/devices`, {
                headers: { Authorization: `Bearer ${cookies.token}` },
                timeout: 60000,
              });

              const allDevices = allDevicesRes.data?.data || allDevicesRes.data || [];
              const userDeviceIds = userData.devices.map((d) => {
                if (typeof d === 'string') return d;
                return d._id || d.id;
              }).filter(Boolean);

              console.log('User device IDs:', userDeviceIds);
              console.log('All devices count:', allDevices.length);

              userDevices = allDevices.filter((device) => {
                const deviceId = device._id || device.id;
                return userDeviceIds.includes(deviceId);
              });

              console.log('Filtered user devices:', userDevices.length);
            }

            // Method 3: If still no devices, try fetching by user ID parameter
            if (userDevices.length === 0 && userData._id) {
              try {
                const userSpecificRes = await axios.get(`${baseurl}/api/devices`, {
                  headers: { Authorization: `Bearer ${cookies.token}` },
                  params: { userId: userData._id },
                  timeout: 60000,
                });
                userDevices = userSpecificRes.data?.data || userSpecificRes.data || [];
                console.log('Fetched by userId parameter:', userDevices);
              } catch (userSpecificErr) {
                console.warn('UserId parameter fetch failed:', userSpecificErr.message);
              }
            }
          } catch (deviceError) {
            console.error('Error fetching user devices:', deviceError);
            toast.error('Failed to fetch your assigned devices');
          }
        } else {
          console.log('No devices assigned to user or devices array is empty');
        }

        console.log('Final user devices:', userDevices);

        dataRef.current.devices = userDevices;
        setMyDevices(userDevices);

        // Calculate enhanced device statistics
        const activeDevices = userDevices.filter((device) => device.isActive || device.status === 'active').length;
        const maintenanceDevices = userDevices.filter((device) => device.status === 'maintenance').length;
        const lowBatteryDevices = userDevices.filter((device) => {
          const batteryLevel = device.batteryLevel || device.battery;
          return batteryLevel && batteryLevel < 20;
        }).length;

        const stats = {
          total: userDevices.length,
          active: activeDevices,
          inactive: userDevices.length - activeDevices - maintenanceDevices,
          maintenance: maintenanceDevices,
          lowBattery: lowBatteryDevices,
        };

        console.log('Calculated device stats:', stats);
        dataRef.current.stats = stats;
        setDeviceStats(stats);

        // Fetch alerts for user's devices only
        try {
          if (userDevices.length > 0) {
            const userDeviceIds = userDevices.map(d => d._id || d.id);
            const alertsRes = await axios.get(`${baseurl}/api/alerts`, {
              headers: { Authorization: `Bearer ${cookies.token}` },
              params: {
                limit: 10,
                deviceIds: userDeviceIds.join(',') // Send device IDs to filter alerts
              },
              timeout: 30000,
            });
            const alertsData = alertsRes.data?.data || alertsRes.data || [];
            dataRef.current.alerts = alertsData.slice(0, 5);
            setRecentAlerts(alertsData.slice(0, 5));
          } else {
            setRecentAlerts([]);
          }
        } catch (alertErr) {
          console.warn('Failed to fetch alerts:', alertErr);
          // Generate sample alerts for user devices only
          const sampleAlerts = userDevices
            .filter((device) => !device.isActive || (device.batteryLevel && device.batteryLevel < 20))
            .slice(0, 3)
            .map((device, index) => ({
              _id: `alert-${index}`,
              severity: !device.isActive ? 'critical' : 'warning',
              message: !device.isActive
                ? `Device offline: ${device.name}`
                : `Low battery: ${device.name} (${device.batteryLevel}%)`,
              timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
              deviceId: device._id,
              deviceName: device.name,
            }));
          dataRef.current.alerts = sampleAlerts;
          setRecentAlerts(sampleAlerts);
        }

        dataRef.current.lastUpdated = new Date();
        setLastUpdated(new Date());
        if (showRefreshToast) {
          toast.success('Dashboard data refreshed successfully');
        }

        console.log('Dashboard data fetch completed successfully');
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred.';
        setError(`Failed to load dashboard data: ${errorMessage}`);

        if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {
          console.log('Request timed out, using fallback data...');
          if (!userInfo) {
            setUserInfo({ name: 'User', email: 'user@example.com', _id: 'fallback-user', devices: [] });
          }
          toast.warning('Dashboard loaded with limited data due to slow server response');
        } else if (!userInfo) {
          toast.error(`Failed to load dashboard data: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cookies.token, baseurl, userInfo, refreshing],
  );

  useEffect(() => {
    if (cookies.token && !circuitBreakerOpen) {
      fetchData();
    } else if (circuitBreakerOpen) {
      setLoading(false);
      setError('Connection temporarily blocked due to repeated failures. Please wait 5 minutes.');
    } else {
      setLoading(false);
      setError('No authentication token found. Please log in.');
      toast.error('You are not logged in.');
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [cookies.token, circuitBreakerOpen]);

  // Connect WebSocket after user info is loaded
  useEffect(() => {
    if (userInfo && cookies.token && !circuitBreakerOpen) {
      connectWebSocket();
    }
  }, [userInfo, cookies.token, circuitBreakerOpen, connectWebSocket]);

  useEffect(() => {
    const uiUpdateTimer = setInterval(() => {
      if (dataRef.current.lastUpdated > lastUpdated) {
        setDeviceStats({ ...dataRef.current.stats });
        setMyDevices([...dataRef.current.devices]);
        setRecentAlerts([...dataRef.current.alerts]);
        setLastUpdated(new Date(dataRef.current.lastUpdated));
      }
    }, 30000);

    return () => clearInterval(uiUpdateTimer);
  }, [lastUpdated]);

  // Filter and sort devices
  const filteredDevices = myDevices
    .filter((device) => {
      const matchesSearch =
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.location && device.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (device.type && device.type.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && (device.isActive || device.status === 'active')) ||
        (filterStatus === 'inactive' && (!device.isActive || device.status === 'inactive')) ||
        (filterStatus === 'maintenance' && device.status === 'maintenance') ||
        (filterStatus === 'low-battery' && device.batteryLevel && device.batteryLevel < 20);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'type') {
        comparison = (a.type || '').localeCompare(b.type || '');
      } else if (sortBy === 'status') {
        const statusA = a.isActive ? 'active' : 'inactive';
        const statusB = b.isActive ? 'active' : 'inactive';
        comparison = statusA.localeCompare(statusB);
      } else if (sortBy === 'battery') {
        comparison = (b.batteryLevel || 0) - (a.batteryLevel || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Export devices as CSV
  const exportDevices = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Name,Type,Location,Status,Battery Level,Signal Strength,Last Active\r\n';

      filteredDevices.forEach((device) => {
        const status = device.isActive ? 'Active' : 'Inactive';
        const lastActive = device.lastActive
          ? new Date(device.lastActive).toLocaleString()
          : device.updatedAt
            ? new Date(device.updatedAt).toLocaleString()
            : 'N/A';
        const battery = device.batteryLevel ? `${device.batteryLevel}%` : 'N/A';
        const signal = device.signalStrength ? `${device.signalStrength}%` : 'N/A';

        csvContent += `"${device.name}","${device.type || 'N/A'}","${device.location || 'N/A'}","${status}","${battery}","${signal}","${lastActive}"\r\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `my-devices-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Devices exported successfully');
    } catch (err) {
      console.error('Error exporting devices:', err);
      toast.error('Failed to export devices');
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    fetchData(true);
  };

  if (loading && !userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center p-4 sm:p-8">
          <div className="relative mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto"></div>
            <Sparkles
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 animate-pulse"
              size={20}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300">Loading Dashboard</p>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Fetching your device data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-6 sm:p-8 text-center">
          <div className="mb-6">
            <AlertTriangle className="h-16 w-16 sm:h-20 sm:w-20 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">Dashboard Error</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-blue-50/60 to-indigo-50/80 dark:from-gray-900/80 dark:via-slate-900/60 dark:to-indigo-950/80 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-6 sm:p-8 text-center">
          <UserCircle className="h-16 w-16 sm:h-20 sm:w-20 text-gray-400 mx-auto mb-6" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 mb-3">Profile Unavailable</h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6">Please try refreshing or logging in again</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-blue-50/60 to-indigo-50/80 dark:from-gray-900/80 dark:via-slate-900/60 dark:to-indigo-950/80">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header Section - Enhanced Mobile Layout */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row justify-between items-start lg:items-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl p-2 sm:p-3">
                <Zap className="text-white" size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  My Dashboard
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    {wsConnected && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />}
                    {!wsConnected && <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />}
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{connectionStatus}</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <Clock size={12} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Updated {lastUpdated.toLocaleTimeString()}</span>
                    <span className="sm:hidden">{lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 w-full lg:w-auto justify-end">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`flex items-center px-3 sm:px-4 py-2 sm:py-2.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg sm:rounded-xl text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-xs sm:text-sm ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCw size={14} className={`mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                <span className="sm:hidden">↻</span>
              </button>
            </div>
          </div>
        </header>

        {/* User Profile Section - Enhanced Mobile Layout */}
        <section className="mb-6 sm:mb-8">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                  <div className="relative mx-auto sm:mx-0">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl p-1">
                      <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-2xl p-3 sm:p-4">
                        <UserCircle size={48} className="sm:w-16 sm:h-16 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-center sm:text-left min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {userInfo.fullName || userInfo.username || 'User'}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 sm:px-3 py-1 rounded-full font-medium capitalize">
                        {userInfo.role || 'user'}
                      </span>
                      {(userInfo.joinDate || userInfo.createdAt) && (
                        <span className="hidden sm:inline">
                          Member since {new Date(userInfo.joinDate || userInfo.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  to="/editprofile"
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto"
                >
                  <Edit size={16} className="mr-2" />
                  Edit Profile
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200/50 dark:border-blue-700/50">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Mail className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-semibold truncate">
                        {userInfo.emailid || userInfo.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-200/50 dark:border-green-700/50">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Phone className="text-green-600 dark:text-green-400 flex-shrink-0" size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-semibold truncate">
                        {userInfo.phone || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-200/50 dark:border-purple-700/50 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <MapPin className="text-purple-600 dark:text-purple-400 flex-shrink-0" size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-semibold truncate">
                        {userInfo.location || userInfo.address || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Device Statistics - Enhanced Mobile Grid */}
        <section className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <TrendingUp size={20} className="sm:w-7 sm:h-7 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Device Overview</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            {/* Total Devices */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 backdrop-blur-xl rounded-lg sm:rounded-2xl shadow-xl border border-blue-200/50 dark:border-blue-700/30 p-3 sm:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                    {deviceStats.total}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl p-2 sm:p-3 group-hover:rotate-12 transition-transform duration-300 mx-auto sm:mx-0">
                  <HardDrive className="text-white" size={16} />
                </div>
              </div>
              <div className="h-1.5 sm:h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>

            {/* Active Devices */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 backdrop-blur-xl rounded-lg sm:rounded-2xl shadow-xl border border-green-200/50 dark:border-green-700/30 p-3 sm:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                    Active
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                    {deviceStats.active}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg sm:rounded-xl p-2 sm:p-3 group-hover:rotate-12 transition-transform duration-300 mx-auto sm:mx-0">
                  <CheckCircle className="text-white" size={16} />
                </div>
              </div>
              <div className="h-1.5 sm:h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                  style={{ width: `${deviceStats.total > 0 ? (deviceStats.active / deviceStats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Inactive Devices */}
            <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 dark:from-red-500/20 dark:to-pink-500/20 backdrop-blur-xl rounded-lg sm:rounded-2xl shadow-xl border border-red-200/50 dark:border-red-700/30 p-3 sm:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Inactive</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                    {deviceStats.inactive}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-lg sm:rounded-xl p-2 sm:p-3 group-hover:rotate-12 transition-transform duration-300 mx-auto sm:mx-0">
                  <XCircle className="text-white" size={16} />
                </div>
              </div>
              <div className="h-1.5 sm:h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full"
                  style={{ width: `${deviceStats.total > 0 ? (deviceStats.inactive / deviceStats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Maintenance Devices */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 dark:from-yellow-500/20 dark:to-orange-500/20 backdrop-blur-xl rounded-lg sm:rounded-2xl shadow-xl border border-yellow-200/50 dark:border-yellow-700/30 p-3 sm:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                    Maintenance
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                    {deviceStats.maintenance}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg sm:rounded-xl p-2 sm:p-3 group-hover:rotate-12 transition-transform duration-300 mx-auto sm:mx-0">
                  <Settings className="text-white" size={16} />
                </div>
              </div>
              <div className="h-1.5 sm:h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                  style={{
                    width: `${deviceStats.total > 0 ? (deviceStats.maintenance / deviceStats.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Low Battery Devices */}
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 backdrop-blur-xl rounded-lg sm:rounded-2xl shadow-xl border border-orange-200/50 dark:border-orange-700/30 p-3 sm:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                    Low Battery
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                    {deviceStats.lowBattery}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg sm:rounded-xl p-2 sm:p-3 group-hover:rotate-12 transition-transform duration-300 mx-auto sm:mx-0">
                  <Battery className="text-white" size={16} />
                </div>
              </div>
              <div className="h-1.5 sm:h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                  style={{
                    width: `${deviceStats.total > 0 ? (deviceStats.lowBattery / deviceStats.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Alerts - Enhanced Mobile Layout */}
        {recentAlerts.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-0">
                    <Activity size={20} className="sm:w-7 sm:h-7 text-yellow-500" />
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Recent Alerts</h3>
                  </div>
                  <Link
                    to="/alerts"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors text-sm sm:text-base"
                  >
                    View All →
                  </Link>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {recentAlerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert._id}
                      className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-l-4 transition-all duration-300 hover:shadow-md ${alert.severity === 'critical'
                        ? 'bg-red-50/80 dark:bg-red-900/20 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                        : alert.severity === 'warning'
                          ? 'bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                          : 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="flex-1 mb-2 sm:mb-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{alert.message}</p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {alert.deviceId && (
                          <Link
                            to={`/devices/${alert.deviceId}`}
                            className="ml-0 sm:ml-4 mt-2 sm:mt-0 px-3 py-1.5 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors inline-block text-center sm:text-left"
                          >
                            View Device
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Device Center - Enhanced Mobile Layout */}
        <section>
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <HardDrive size={20} className="sm:w-7 sm:h-7 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Device Center</h2>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 sm:flex-initial">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search devices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg sm:rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 w-full sm:min-w-[200px] text-sm sm:text-base"
                    />
                  </div>

                  {/* Filter and Sort Row */}
                  <div className="flex gap-2 sm:gap-3">
                    {/* Filter */}
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-2 sm:px-4 py-2 sm:py-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg sm:rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-xs sm:text-sm flex-1 sm:flex-initial"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="low-battery">Low Battery</option>
                    </select>

                    {/* Sort */}
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-');
                        setSortBy(field);
                        setSortOrder(order);
                      }}
                      className="px-2 sm:px-4 py-2 sm:py-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg sm:rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-xs sm:text-sm flex-1 sm:flex-initial"
                    >
                      <option value="name-asc">Name A-Z</option>
                      <option value="name-desc">Name Z-A</option>
                      <option value="type-asc">Type A-Z</option>
                      <option value="type-desc">Type Z-A</option>
                      <option value="status-asc">Status A-Z</option>
                      <option value="status-desc">Status Z-A</option>
                      <option value="battery-desc">Battery High-Low</option>
                      <option value="battery-asc">Battery Low-High</option>
                    </select>

                    {/* Export */}
                    <button
                      onClick={exportDevices}
                      className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl text-xs sm:text-sm"
                    >
                      <Download size={14} className="mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Export</span>
                      <span className="sm:hidden">↓</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Device List */}
              {filteredDevices.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <HardDrive size={48} className="sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                    {searchTerm || filterStatus !== 'all' ? 'No devices match your filters' : 'No devices assigned'}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500 mb-4 sm:mb-6">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'You don\'t have any devices assigned yet'}
                  </p>
                  {(searchTerm || filterStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilterStatus('all');
                      }}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile Card View (< sm screens) */}
                  <div className="block sm:hidden space-y-3">
                    {filteredDevices.map((device) => (
                      <div
                        key={device._id}
                        className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div
                              className={`w-3 h-3 rounded-full flex-shrink-0 ${device.isActive ? 'bg-green-500' : device.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                            ></div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 dark:text-white truncate">{device.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {device._id.slice(-6)}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${device.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : device.status === 'maintenance'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}
                          >
                            {device.isActive ? 'Active' : device.status === 'maintenance' ? 'Maintenance' : 'Inactive'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
                          <div>
                            <span className="font-medium">Type:</span> {device.type || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {device.location || 'N/A'}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Battery
                              size={12}
                              className={
                                device.batteryLevel > 50
                                  ? 'text-green-500'
                                  : device.batteryLevel > 20
                                    ? 'text-yellow-500'
                                    : 'text-red-500'
                              }
                            />
                            <span>{device.batteryLevel ? `${device.batteryLevel}%` : 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {device.signalStrength > 0 ? (
                              <Wifi size={12} className="text-green-500" />
                            ) : (
                              <WifiOff size={12} className="text-gray-400" />
                            )}
                            <span>{device.signalStrength ? `${device.signalStrength}%` : 'N/A'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Last seen: {device.lastActive
                              ? new Date(device.lastActive).toLocaleDateString()
                              : 'N/A'}
                          </div>
                          <Link
                            to={`/devices/${device._id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Eye size={12} className="mr-1" />
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View (>= sm screens) */}
                  <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200/50 dark:border-gray-700/50">
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Device
                          </th>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Battery
                          </th>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Signal
                          </th>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Last Active
                          </th>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50 bg-white/50 dark:bg-gray-900/50">
                        {filteredDevices.map((device) => (
                          <tr
                            key={device._id}
                            className="hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors duration-200"
                          >
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${device.isActive ? 'bg-green-500' : 'bg-red-500'
                                    } ring-2 ring-white dark:ring-gray-900`}
                                ></div>
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{device.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    ID: {device._id.slice(-6)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-700 dark:text-gray-300 font-medium text-sm">
                              {device.type || 'N/A'}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 text-sm">
                                <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                <span className="truncate">{device.location || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              <span
                                className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${device.isActive
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
                                  }`}
                              >
                                {device.isActive ? (
                                  <>
                                    <CheckCircle size={10} className="mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={10} className="mr-1" />
                                    Inactive
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              {device.batteryLevel ? (
                                <div className="flex items-center space-x-2">
                                  <Battery
                                    size={14}
                                    className={`${device.batteryLevel > 50
                                      ? 'text-green-500'
                                      : device.batteryLevel > 20
                                        ? 'text-yellow-500'
                                        : 'text-red-500'
                                      }`}
                                  />
                                  <span
                                    className={`font-semibold text-sm ${device.batteryLevel > 50
                                      ? 'text-green-600 dark:text-green-400'
                                      : device.batteryLevel > 20
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-red-600 dark:text-red-400'
                                      }`}
                                  >
                                    {device.batteryLevel}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              {device.signalStrength ? (
                                <div className="flex items-center space-x-2">
                                  {device.signalStrength > 0 ? (
                                    <Wifi
                                      size={14}
                                      className={`${device.signalStrength > 70
                                        ? 'text-green-500'
                                        : device.signalStrength > 30
                                          ? 'text-yellow-500'
                                          : 'text-red-500'
                                        }`}
                                    />
                                  ) : (
                                    <WifiOff size={14} className="text-gray-400" />
                                  )}
                                  <span
                                    className={`font-semibold text-sm ${device.signalStrength > 70
                                      ? 'text-green-600 dark:text-green-400'
                                      : device.signalStrength > 30
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-red-600 dark:text-red-400'
                                      }`}
                                  >
                                    {device.signalStrength}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              {device.lastActive ? (
                                new Date(device.lastActive).toLocaleString()
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              <Link
                                to={`/devices/${device._id}`}
                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Eye size={12} className="mr-1" />
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default MyDashboardPage;