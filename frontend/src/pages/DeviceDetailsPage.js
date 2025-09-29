import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { toast } from 'react-hot-toast';
import { useWebSocket } from '../contexts/WebSocketContext.js';
import { useSystemMonitoring } from '../hooks/useSystemMonitoring';
import { Download, TrendingUp, Activity, GaugeIcon, RefreshCw, Wifi, WifiOff, Calendar } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format, parseISO, startOfDay, subDays, subWeeks, subHours, addDays, eachDayOfInterval, differenceInDays } from 'date-fns';

// Import enhanced components
import EnhancedGauge from '../components/EnhancedGauge';
import SystemMonitoringWidget from '../components/SystemMonitoringWidget';
import MessageBox from '../components/MessageBox';
import MonthSelector from '../components/MonthSelector';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { getExternalApiParameterName, getParametersForDeviceType } from '../utils/parameterMapping';

// Register Chart.js components with error handling
try {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale,
  );
} catch (error) {
  console.error('Error registering Chart.js components:', error);
}

const NON_GRAPHABLE_PARAMETERS = [
  "version",
  "errorCode",
  "error_code",
  "last_updated",
  "status",
  "batteryLevel",
  "__v",
  "order",
  "liquid_level_raw",
  "level",
  "processedForAnalytics",
  "sensorId",
  "processed",
  "id",
  "_id",
  "deviceId",
  "timestamp",
  "createdAt",
  "updatedAt",
  "serialNumber",
  "deviceType",
];

const DBM_NAMES = ["dbm", "dBm", "signalStrength", "signal_strength", "signal_rssi_dbm", "signal_dbm"];
const RAW_RSSI_NAMES = ["rssi_raw", "signal_rssi_raw", "signal_rssi"];

const GAUGE_PARAMETERS_CONFIG = {
  ozone: {
    min: 0,
    max: 200,
    unit: "µg/m³",
    zones: [
      { value: 0, color: "#22C55E", label: "Good" },
      { value: 60, color: "#FACC15", label: "Moderate" },
      { value: 100, color: "#FB923C", label: "Unhealthy for Sensitive Groups" },
      { value: 140, color: "#EF4444", label: "Unhealthy" },
      { value: 180, color: "#8B5CF6", label: "Very Unhealthy" },
    ],
  },
  humidity: {
    min: 0,
    max: 100,
    unit: "%",
    zones: [
      { value: 0, color: "#EF4444", label: "Too Low" },
      { value: 30, color: "#22C55E", label: "Optimal" },
      { value: 60, color: "#FACC15", label: "High" },
      { value: 80, color: "#EF4444", label: "Too High" },
    ],
  },
  temperature: {
    min: -20,
    max: 50,
    unit: "°C",
    zones: [
      { value: -20, color: "#60A5FA", label: "Very Cold" },
      { value: 0, color: "#2563EB", label: "Cold" },
      { value: 18, color: "#22C55E", label: "Comfortable" },
      { value: 26, color: "#FACC15", label: "Warm" },
      { value: 35, color: "#EF4444", label: "Hot" },
    ],
  },
  pm25: {
    min: 0,
    max: 250,
    unit: "µg/m³",
    zones: [
      { value: 0, color: "#22C55E", label: "Good" },
      { value: 54.1, color: "#FACC15", label: "Moderate" },
      { value: 154.1, color: "#FB923C", label: "Unhealthy for Sensitive" },
      { value: 254.1, color: "#EF4444", label: "Unhealthy" },
      { value: 354.1, color: "#8B5CF6", label: "Very Unhealthy" },
      { value: 424.1, color: "#7C2D12", label: "Hazardous" },
    ],
  },
  pm10: {
    min: 0,
    max: 450,
    unit: "µg/m³",
    zones: [
      { value: 0, color: "#22C55E", label: "Good" },
      { value: 54.1, color: "#FACC15", label: "Moderate" },
      { value: 154.1, color: "#FB923C", label: "Unhealthy for Sensitive" },
      { value: 254.1, color: "#EF4444", label: "Unhealthy" },
      { value: 354.1, color: "#8B5CF6", label: "Very Unhealthy" },
      { value: 424.1, color: "#7C2D12", label: "Hazardous" },
    ],
  },
  noise: {
    min: 0,
    max: 120,
    unit: "dB",
    zones: [
      { value: 0, color: "#22C55E", label: "Quiet" },
      { value: 40, color: "#FACC15", label: "Moderate" },
      { value: 70, color: "#FB923C", label: "Loud" },
      { value: 85, color: "#EF4444", label: "Very Loud" },
      { value: 100, color: "#8B5CF6", label: "Dangerous" },
    ],
  },
  co2: {
    min: 0,
    max: 2000,
    unit: "ppm",
    zones: [
      { value: 0, color: "#22C55E", label: "Excellent" },
      { value: 600, color: "#FACC15", label: "Good" },
      { value: 1000, color: "#FB923C", label: "Moderate" },
      { value: 1500, color: "#EF4444", label: "Poor" },
      { value: 2000, color: "#8B5CF6", label: "Unhealthy" },
    ],
  },
  atmosphericPressure: {
    min: 800,
    max: 1100,
    unit: "hPa",
    zones: [
      { value: 800, color: "#EF4444", label: "Very Low" },
      { value: 950, color: "#FACC15", label: "Low" },
      { value: 1013, color: "#22C55E", label: "Normal" },
      { value: 1050, color: "#FACC15", label: "High" },
      { value: 1100, color: "#EF4444", label: "Very High" },
    ],
  },
  windSpeed: {
    min: 0,
    max: 50,
    unit: "m/s",
    zones: [
      { value: 0, color: "#22C55E", label: "Calm" },
      { value: 5, color: "#FACC15", label: "Light Breeze" },
      { value: 15, color: "#FB923C", label: "Strong Breeze" },
      { value: 25, color: "#EF4444", label: "Gale" },
      { value: 35, color: "#8B5CF6", label: "Storm" },
    ],
  },
  signalStrength: {
    min: -120,
    max: 0,
    unit: "dBm",
    zones: [
      { value: -120, color: "#EF4444", label: "Very Poor" },
      { value: -100, color: "#FB923C", label: "Poor" },
      { value: -80, color: "#FACC15", label: "Fair" },
      { value: -60, color: "#22C55E", label: "Good" },
      { value: -40, color: "#10B981", label: "Excellent" },
    ],
  },
  rainfall: {
    min: 0,
    max: 100,
    unit: "mm",
    zones: [
      { value: 0, color: "#22C55E", label: "No Rain" },
      { value: 2.5, color: "#FACC15", label: "Light Rain" },
      { value: 10, color: "#FB923C", label: "Moderate Rain" },
      { value: 50, color: "#EF4444", label: "Heavy Rain" },
      { value: 100, color: "#8B5CF6", label: "Very Heavy Rain" },
    ],
  },
  totalSolarRadiation: {
    min: 0,
    max: 1200,
    unit: "W/m²",
    zones: [
      { value: 0, color: "#1F2937", label: "Night" },
      { value: 200, color: "#FACC15", label: "Dawn/Dusk" },
      { value: 400, color: "#FB923C", label: "Cloudy" },
      { value: 800, color: "#22C55E", label: "Sunny" },
      { value: 1000, color: "#EF4444", label: "Very Bright" },
    ],
  },
  windDir: {
    min: 0,
    max: 360,
    unit: "°",
    zones: [
      { value: 0, color: "#22C55E", label: "North" },
      { value: 90, color: "#FACC15", label: "East" },
      { value: 180, color: "#FB923C", label: "South" },
      { value: 270, color: "#EF4444", label: "West" },
    ],
  },
  batteryLevel: {
    min: 0,
    max: 100,
    unit: "%",
    zones: [
      { value: 0, color: "#EF4444", label: "Critical" },
      { value: 20, color: "#FB923C", label: "Low" },
      { value: 50, color: "#FACC15", label: "Medium" },
      { value: 80, color: "#22C55E", label: "Good" },
      { value: 100, color: "#10B981", label: "Full" },
    ],
  },
};

const DeviceDetailsPage = () => {
  const { deviceId } = useParams();
  const wsContext = useWebSocket();
  const { subscribeToDevice, getDeviceSensorData, isConnected, connectionStatus } = wsContext || {};
  const [device, setDevice] = useState(null);
  const [currentSensorData, setCurrentSensorData] = useState({});
  const [analyticsData, setAnalyticsData] = useState({});
  const [historicalRangeData, setHistoricalRangeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [sensorDataLoading, setSensorDataLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState("daily");
  const [refreshing, setRefreshing] = useState(false);
  const [cookies] = useCookies(["token"]);
  const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  // Custom date range state for month selections
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  // Enhanced chart management with stable references and animation
  const chartInstancesRef = useRef(new Map());
  const animationFrameRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [messageBox, setMessageBox] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false); // Disabled by default to prevent errors

  // Debounce for historical data fetch
  const fetchHistoricalDataDebounceRef = useRef(null);
  const lastRealTimeUpdateRef = useRef(null);
  const pulseIntervalRef = useRef(null);

  // System monitoring integration
  const { systemHealth, isHealthy, isDegraded, isUnhealthy } = useSystemMonitoring({
    enableAutoRefresh: true,
    refreshInterval: 60000,
    enableHealthCheck: true,
    enableStats: false,
  });

  const {
    data: realtimeSensorData,
    loading: realtimeLoading,
    error: realtimeError,
    lastUpdate: realtimeLastUpdate,
    refresh: refreshRealtimeData,
  } = useRealtimeData("sensor_data", {
    deviceId: deviceId,
    enablePersistence: true,
    requestThrottle: 5000,
    cacheKey: `sensor_${deviceId}`,
  });

  // Get user role
  const getUserRole = useCallback(() => {
    try {
      if (cookies.token) {
        const payload = JSON.parse(atob(cookies.token.split(".")[1]));
        return payload.role || "user";
      }
      return "user";
    } catch (error) {
      console.error("Error decoding token:", error);
      return "user";
    }
  }, [cookies.token]);

  // Enhanced current sensor data fetching - fallback method
  const fetchCurrentSensorData = useCallback(async () => {
    if (!device?.serialNumber || !cookies.token) {
      console.log("Cannot fetch sensor data - missing device serial or token");
      return;
    }

    setSensorDataLoading(true);
    try {
                const response = await axios.get(`${baseurl}/api/devices/sensor-data/latest/${device.serialNumber}`, {
            headers: { Authorization: `Bearer ${cookies.token}` },
          });
      if (response.data.success && response.data.data) {
        setCurrentSensorData({
          ...response.data.data,
          last_updated: response.data.data.timestamp || new Date().toISOString(),
        });
        console.log("✅ Current sensor data loaded from local database:", response.data.data);
      } else {
        setCurrentSensorData({});
        console.log("No sensor data available from local database");
      }
    } catch (error) {
      console.error("Error fetching sensor data from local database:", error);
      setCurrentSensorData({});
    } finally {
      setSensorDataLoading(false);
    }
  }, [baseurl, cookies.token, device?.serialNumber, device?.type]);

  // Fetch device details - matches backend GET /api/devices/:id
  const fetchDeviceDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseurl}/api/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
      });

      // Handle different response structures
      const deviceData = response.data.device || response.data.data || response.data;
      console.log("Device details loaded:", deviceData);
      setDevice(deviceData);
    } catch (err) {
      console.error("Error fetching device details:", err);
      toast.error("Failed to load device details.");
      setMessageBox({
        message: err.response?.data?.message || err.message || "Failed to load device details.",
        type: "error",
        onConfirm: () => setMessageBox(null),
      });
    } finally {
      setLoading(false);
    }
  }, [baseurl, cookies.token, deviceId]);

  // FIXED: Fetch latest analytics snapshot with device type
  const fetchLatestAnalytics = useCallback(async () => {
    if (!device?.serialNumber || !device?.type || !cookies.token) {
      console.log("Cannot fetch analytics - missing device info or token:", {
        hasDevice: !!device,
        serialNumber: device?.serialNumber,
        deviceType: device?.type,
        hasToken: !!cookies.token,
      });
      return;
    }

    console.log(`Fetching latest analytics for device type: ${device.type}, serial: ${device.serialNumber}`);

    try {
      // FIXED: Pass device type as query parameter to get correct device-specific data
      const response = await axios.get(`${baseurl}/api/sensor/latest-analytics/${device.serialNumber}`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
        params: {
          deviceType: device.type // This ensures the backend returns data specific to this device type
        }
      });

      if (response.data.success && response.data.data) {
        console.log("Latest analytics loaded for device type:", device.type, response.data.data);
        setCurrentSensorData({
          ...response.data.data,
          last_updated: response.data.timestamp || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error fetching latest analytics:", error);
      console.log("Response data:", error.response?.data);

      // FIXED: Fallback method also includes device type
      console.log("Trying fallback endpoint with device type...");
      await fetchCurrentSensorData();
    }
  }, [baseurl, cookies.token, device, fetchCurrentSensorData]);

  // FIXED: Enhanced fetchLatestAnalyticsWithDeviceType - more reliable method
  const fetchLatestAnalyticsWithDeviceType = useCallback(async () => {
    if (!device?.serialNumber || !device?.type || !cookies.token) {
      console.log("Cannot fetch analytics - missing device info or token");
      return;
    }

    console.log(`🔄 Fetching device-specific analytics for type: ${device.type}, serial: ${device.serialNumber}`);
    setSensorDataLoading(true);

    try {
      // Use the historical-range endpoint for today to get latest data with proper device type filtering
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const response = await axios.get(`${baseurl}/api/sensor/historical-range`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
        params: {
          deviceType: device.type,
          deviceNumber: device.serialNumber,
          from: today,
          to: today,
          latest: true // Request only the latest reading
        },
      });

      console.log("✅ Device-specific analytics response:", response.data);

      if (response.data.success && response.data.data) {
        // Process the data to get the latest readings
        let latestData = {};
        
        if (Array.isArray(response.data.data) && response.data.data.length > 0) {
          // Get the most recent data point
          latestData = response.data.data[response.data.data.length - 1];
        } else if (typeof response.data.data === 'object') {
          latestData = response.data.data;
        }

        setCurrentSensorData({
          ...latestData,
          last_updated: latestData.timestamp || new Date().toISOString(),
        });

        console.log(`✅ Device-specific current data set for ${device.type}:`, latestData);
      } else {
        console.log("❌ No device-specific data available");
        // Try the direct local database approach
        await fetchCurrentSensorData();
      }
    } catch (error) {
      console.error("❌ Error fetching device-specific analytics:", error);
      
      // Final fallback to local database sensor data endpoint
      console.log("🔄 Trying local database fallback...");
      await fetchCurrentSensorData();
    } finally {
      setSensorDataLoading(false);
    }
  }, [baseurl, cookies.token, device?.type, device?.serialNumber, fetchCurrentSensorData]);

  // Handle custom date range changes from MonthSelector
  const handleDateRangeChange = useCallback((startDate, endDate) => {
    console.log("📅 Date range changed:", { startDate, endDate });
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  }, []);

  // FIXED: Fetch daily data using historical-range endpoint with proper device type
  const fetchDailyDataViaHistoricalRange = useCallback(async () => {
    if (!device?.type || !device?.serialNumber || !cookies.token) {
      console.log("Cannot fetch daily data - missing device info or token");
      return;
    }

    console.log(`🔄 Fetching daily data via historical-range for device: ${device.type}, serial: ${device.serialNumber}`);
    setSensorDataLoading(true);

    try {
      // Get today's date in YYYY-MM-DD format
      const today = format(new Date(), 'yyyy-MM-dd');

      const response = await axios.get(`${baseurl}/api/sensor/historical-range`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
        params: {
          deviceType: device.type, // CRITICAL: This ensures device-specific data
          deviceNumber: device.serialNumber,
          from: today,
          to: today,
        },
      });

      console.log(`✅ Daily historical-range response for ${device.type}:`, response.data);

      if (response.data.success && response.data.data) {
        setAnalyticsData(response.data.data);
        console.log(`✅ Daily data via historical-range loaded for ${device.type}:`, response.data.data);
      } else {
        setAnalyticsData({});
        console.log("❌ No daily data from historical-range endpoint");
      }
    } catch (error) {
      console.error("❌ Error fetching daily data via historical-range:", error);
      console.log("Error response:", error.response?.data);
      setAnalyticsData({});

      // Show more specific error message
      if (error.response?.status === 400) {
        toast.error(`Failed to fetch daily data for ${device.type} - invalid parameters`);
      } else {
        toast.error(`Failed to fetch sensor data for ${device.type}`);
      }
    } finally {
      setSensorDataLoading(false);
    }
  }, [baseurl, cookies.token, device?.type, device?.serialNumber]);

  // FIXED: Fetch historical analytics with proper device type validation
  const fetchHistoricalAnalytics = useCallback(async () => {
    if (!device?.type || !device?.serialNumber || !cookies.token) {
      console.log("Cannot fetch historical analytics - missing device info or token");
      return;
    }

    // For daily range, use the new historical-range endpoint
    if (selectedRange === "daily") {
      return fetchDailyDataViaHistoricalRange();
    }

    console.log(
      `🔄 Fetching historical analytics for device: ${device.type}, serial: ${device.serialNumber}, period: ${selectedRange}`,
    );
    setSensorDataLoading(true);

    try {
      // Calculate start date based on selected range
      let startDate;
      if (selectedRange === "weekly") {
        startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      } else if (selectedRange === "monthly") {
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      } else {
        startDate = format(new Date(), 'yyyy-MM-dd');
      }

      const response = await axios.get(`${baseurl}/api/sensor/analytic-data`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
        params: {
          deviceType: device.type, // CRITICAL: This ensures device-specific data
          deviceNumber: device.serialNumber,
          period: selectedRange,
          startDate: startDate,
        },
      });

      console.log(`✅ Historical analytics response for ${device.type}:`, response.data);

      if (response.data.success && response.data.data) {
        setAnalyticsData(response.data.data);
        console.log(`✅ Historical analytics loaded for ${device.type}:`, response.data);
      } else {
        setAnalyticsData({});
        console.log("❌ No historical analytics data");
      }
    } catch (error) {
      console.error("❌ Error fetching historical analytics:", error);
      console.log("Error response:", error.response?.data);
      setAnalyticsData({});
      toast.error(`Failed to fetch historical data for ${device.type}`);
    } finally {
      setSensorDataLoading(false);
    }
  }, [baseurl, cookies.token, device?.type, device?.serialNumber, selectedRange, fetchDailyDataViaHistoricalRange]);

  // FIXED: Fetch historical range data with improved month support
  const fetchHistoricalRange = useCallback(async () => {
    if (!device?.type || !device?.serialNumber || !cookies.token || !customStartDate || !customEndDate) {
      console.log("Cannot fetch historical range - missing requirements:", {
        hasDevice: !!device,
        hasDeviceType: !!device?.type,
        hasSerial: !!device?.serialNumber,
        hasToken: !!cookies.token,
        hasStartDate: !!customStartDate,
        hasEndDate: !!customEndDate
      });
      return;
    }

    console.log(`🔄 Fetching historical range for device: ${device.type}, serial: ${device.serialNumber}`);
    console.log(`📅 Date range: ${customStartDate} to ${customEndDate}`);
    setSensorDataLoading(true);

    try {
      // Calculate the difference in days to determine grouping
      const startDate = parseISO(format(customStartDate, 'yyyy-MM-dd'));
      const endDate = parseISO(format(customEndDate, 'yyyy-MM-dd'));
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      let groupBy = "day";
      if (daysDiff <= 1) groupBy = "hour";
      else if (daysDiff <= 7) groupBy = "day";
      else if (daysDiff <= 31) groupBy = "day"; // Changed from "week" to "day" for better month display
      else groupBy = "week";

      console.log(`📊 Using groupBy: ${groupBy} for ${daysDiff} days`);

      const response = await axios.get(`${baseurl}/api/sensor/historical-range`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
        params: {
          deviceType: device.type, // CRITICAL: This ensures device-specific data
          deviceNumber: device.serialNumber,
          from: format(customStartDate, 'yyyy-MM-dd'),
          to: format(customEndDate, 'yyyy-MM-dd'),
          groupBy,
        },
      });

      console.log(`✅ Historical range response for ${device.type}:`, response.data);

      if (response.data.success && response.data.data) {
        // FIXED: Store the complete response data structure
        setHistoricalRangeData(response.data);
        console.log(`✅ Historical range data loaded for ${device.type}:`, response.data);
      } else {
        setHistoricalRangeData({});
        console.log("❌ No historical range data");
      }
    } catch (error) {
      console.error("❌ Error fetching historical range data:", error);
      console.log("Error response:", error.response?.data);
      setHistoricalRangeData({});
      toast.error(`Failed to fetch range data for ${device.type}`);
    } finally {
      setSensorDataLoading(false);
    }
  }, [baseurl, cookies.token, device?.type, device?.serialNumber, customStartDate, customEndDate]);

  // FIXED: Process analytics data for charts with proper timestamp generation based on custom dates
  const processAnalyticsForCharts = useCallback(
    (analyticsData, deviceType) => {
      console.log(`🔄 processAnalyticsForCharts called with device type: ${deviceType}`, { analyticsData });

      // Handle the external API format (arrays of data)
      if (analyticsData && typeof analyticsData === "object" && !Array.isArray(analyticsData)) {
        const relevantParams = getParametersForDeviceType(deviceType);
        console.log(`📊 Relevant params for device type ${deviceType}:`, relevantParams);

        // Check if we have external API format data (arrays)
        const hasExternalApiFormat = relevantParams.some((param) => {
          const externalParamName = getExternalApiParameterName(param);
          return analyticsData[externalParamName] && Array.isArray(analyticsData[externalParamName]);
        });

        if (hasExternalApiFormat) {
          console.log(`📊 Processing external API format data for ${deviceType}`);
          
          // Get the first parameter to determine the length of data arrays
          const firstParam = relevantParams.find((param) => {
            const externalParamName = getExternalApiParameterName(param);
            return analyticsData[externalParamName] && Array.isArray(analyticsData[externalParamName]);
          });

          if (!firstParam) {
            console.log(`❌ No valid parameter arrays found in analytics data for ${deviceType}`);
            return [];
          }

          const externalFirstParamName = getExternalApiParameterName(firstParam);
          const dataLength = analyticsData[externalFirstParamName].length;
          console.log(`📏 Data length determined from first param for ${deviceType}:`, dataLength);

          // FIXED: Create proper timestamps based on the selected range and custom dates
          const processedData = [];
          for (let i = 0; i < dataLength; i++) {
            let timestamp;
            
            // FIXED: Use custom date range if available
            if (customStartDate && customEndDate) {
              // For custom date ranges, distribute timestamps evenly across the range
              const startTimestamp = new Date(customStartDate).getTime();
              const endTimestamp = new Date(customEndDate).getTime();
              const timeStep = (endTimestamp - startTimestamp) / (dataLength - 1);
              timestamp = new Date(startTimestamp + (timeStep * i)).toISOString();
            } else {
              // Fallback to relative timestamps based on selected range
              if (selectedRange === "weekly") {
                // Generate timestamps for each day of the week, starting from a week ago
                const daysAgo = dataLength - 1 - i;
                const date = subDays(startOfDay(new Date()), daysAgo);
                timestamp = date.toISOString();
              } else if (selectedRange === "monthly") {
                const weeksAgo = dataLength - 1 - i;
                const date = subWeeks(startOfDay(new Date()), weeksAgo);
                timestamp = date.toISOString();
              } else {
                // Daily or default - use hours
                const hoursAgo = dataLength - 1 - i;
                const date = subHours(new Date(), hoursAgo);
                timestamp = date.toISOString();
              }
            }

            const processedPoint = {
              timestamp: timestamp,
            };

            // Map each parameter from external API format to internal format
            relevantParams.forEach((paramName) => {
              const externalParamName = getExternalApiParameterName(paramName);
              if (analyticsData[externalParamName] && Array.isArray(analyticsData[externalParamName])) {
                const value = analyticsData[externalParamName][i];
                // Include all values, even zeros for proper charting
                if (value !== undefined && value !== null) {
                  processedPoint[paramName] = value;
                }
              }
            });

            processedData.push(processedPoint);
          }

          console.log(`✅ Processed external API data for charts (${deviceType}):`, processedData);
          return processedData;
        }

        // Handle direct object format (already processed)
        console.log(`📊 Processing direct object format data for ${deviceType}`);
        const processedData = [{
          timestamp: new Date().toISOString(),
          ...analyticsData
        }];
        
        return processedData;
      }

      // Handle legacy array format (if still used)
      if (Array.isArray(analyticsData) && analyticsData.length > 0) {
        console.log(`📊 Processing legacy array format data for ${deviceType}`);
        return analyticsData.map((dataPoint) => ({
          timestamp: dataPoint.timestamp || dataPoint.created_at || new Date().toISOString(),
          ...dataPoint
        }));
      }

      console.log(`❌ No valid data format found for ${deviceType}`);
      return [];
    },
    [selectedRange, customStartDate, customEndDate],
  );

  // FIXED: Process historical range data for charts with proper timestamp generation for custom date ranges
  const processHistoricalRangeForCharts = useCallback((rangeDataResponse, paramName) => {
    console.log(`📊 Processing historical range data for ${paramName}:`, rangeDataResponse);

    // Handle the external API array format
    if (rangeDataResponse && rangeDataResponse.data && typeof rangeDataResponse.data === 'object') {
      const externalParamName = getExternalApiParameterName(paramName);
      console.log(`📊 Looking for external param: ${externalParamName} for ${paramName}`);

      if (Array.isArray(rangeDataResponse.data[externalParamName])) {
        const dataArray = rangeDataResponse.data[externalParamName];
        const groupBy = rangeDataResponse.groupBy || "day";
        
        console.log(`📊 Found array data for ${externalParamName}:`, dataArray);
        console.log(`📊 Group by: ${groupBy}`);

        // FIXED: Create timestamps based on the actual custom date range
        const processedData = dataArray
          .map((value, index) => {
            if (value === null || value === undefined) return null;

            let timestamp;
            
            // FIXED: Use the actual custom date range for timestamp generation
            if (customStartDate && customEndDate) {
              // Calculate proper timestamps within the selected date range
              const startDate = new Date(customStartDate);
              const endDate = new Date(customEndDate);
              const totalDays = differenceInDays(endDate, startDate) + 1;
              
              if (groupBy === 'hour') {
                // For hourly data, distribute across 24 hours of the selected day
                const hoursStep = 24 / dataArray.length;
                const hourOffset = index * hoursStep;
                timestamp = new Date(startDate.getTime() + (hourOffset * 60 * 60 * 1000));
              } else if (groupBy === 'day') {
                // For daily data, distribute across the days in the range
                const dayStep = Math.max(1, Math.floor(totalDays / dataArray.length));
                timestamp = addDays(startDate, index * dayStep);
              } else {
                // For weekly or other groupings
                const dayStep = Math.max(1, Math.floor(totalDays / dataArray.length));
                timestamp = addDays(startDate, index * dayStep);
              }
            } else {
              // Fallback to relative timestamps (original logic)
              const now = new Date();
              if (groupBy === 'hour') {
                timestamp = subHours(now, dataArray.length - 1 - index);
              } else if (groupBy === 'day') {
                timestamp = subDays(startOfDay(now), dataArray.length - 1 - index);
              } else if (groupBy === 'week') {
                timestamp = subWeeks(startOfDay(now), dataArray.length - 1 - index);
              } else {
                timestamp = subDays(startOfDay(now), dataArray.length - 1 - index);
              }
            }

            return {
              timestamp: timestamp.toISOString(),
              value: typeof value === 'number' ? value : 0,
              displayTimestamp: format(timestamp, groupBy === 'hour' ? 'HH:mm' : 'MMM d'),
            };
          })
          .filter(item => item !== null);

        console.log(`✅ Processed historical range data for ${paramName}:`, processedData);
        return processedData;
      }
    }

    // Handle legacy array format (if still used)
    if (Array.isArray(rangeDataResponse)) {
      return rangeDataResponse
        .map((item) => ({
          timestamp: item.periodStart,
          value: item[`avg${paramName.charAt(0).toUpperCase() + paramName.slice(1)}`] || 0,
          displayTimestamp: format(parseISO(item.periodStart), "MMM d"),
        }))
        .filter((item) => item.value !== undefined && item.value !== null);
    }

    console.log(`❌ No valid historical range data format found for ${paramName}`);
    return [];
  }, [customStartDate, customEndDate]);

  // FIXED: Get chart data based on current mode with improved data extraction
  const getChartDataForParameter = useCallback(
    (paramName) => {
      console.log(`📊 getChartDataForParameter called for: ${paramName} (device type: ${device?.type})`);
      console.log(`📊 Current analyticsData:`, analyticsData);
      console.log(`📊 Historical range data:`, historicalRangeData);
      console.log(`📊 Selected range:`, selectedRange);

      // FIXED: Handle both array and object formats for historical range data
      if (customStartDate && customEndDate && historicalRangeData && Object.keys(historicalRangeData).length > 0) {
        console.log(`📊 Processing historical range data for ${paramName}`);
        return processHistoricalRangeForCharts(historicalRangeData, paramName);
      } else if (analyticsData) {
        // Process the analytics data to get chart-ready format
        const processedData = processAnalyticsForCharts(analyticsData, device?.type);
        console.log(`📊 Processed data for ${device?.type}:`, processedData);

        // Extract data for the specific parameter
        const parameterData = processedData
          .filter((dataPoint) => {
            const hasValue = dataPoint[paramName] !== undefined && dataPoint[paramName] !== null;
            console.log(`📊 Data point for ${paramName} (${device?.type}):`, { value: dataPoint[paramName], hasValue });
            return hasValue;
          })
          .map((dataPoint) => ({
            timestamp: dataPoint.timestamp,
            value: dataPoint[paramName],
          }));

        console.log(`📊 Final parameter data for ${paramName} (${device?.type}):`, parameterData);
        return parameterData;
      }
      return [];
    },
    [
      analyticsData,
      historicalRangeData,
      customStartDate,
      customEndDate,
      processAnalyticsForCharts,
      processHistoricalRangeForCharts,
      device?.type,
    ],
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    console.log(`🔄 [DeviceDetails] Manual refresh triggered for device type: ${device?.type}`);

    try {
      if (refreshRealtimeData) {
        refreshRealtimeData();
      }

      // Use the enhanced method that includes device type
      await fetchLatestAnalyticsWithDeviceType();

      if (customStartDate && customEndDate) {
        await fetchHistoricalRange();
      } else {
        await fetchHistoricalAnalytics();
      }

      toast.success(`Device data refreshed successfully for ${device?.type}!`);
    } catch (error) {
      console.error("Error refreshing device data:", error);
      toast.error(`Failed to refresh device data for ${device?.type}`);
    } finally {
      setRefreshing(false);
    }
  }, [
    refreshing,
    refreshRealtimeData,
    fetchLatestAnalyticsWithDeviceType,
    fetchHistoricalAnalytics,
    fetchHistoricalRange,
    customStartDate,
    customEndDate,
    device?.type,
  ]);

  // FIXED: Enhanced chart data generation with safer configuration
  const getChartData = useCallback(
    (data, parameterName, unit, isDark, chartType) => {
      if (!data || data.length === 0) {
        return { 
          labels: [], 
          datasets: [] 
        };
      }

      const isDbm = DBM_NAMES.some((name) => parameterName.toLowerCase().includes(name.toLowerCase()));
      const isRawRssi = RAW_RSSI_NAMES.some((name) => parameterName.toLowerCase().includes(name.toLowerCase()));

      const processedData = data.map((d) => ({
        x: d.timestamp,
        y: d.value,
      }));

      const getColor = () => {
        if (isDbm) return isDark ? "#F59E0B" : "#D97706";
        if (isRawRssi) return isDark ? "#10B981" : "#059669";
        return isDark ? "#3B82F6" : "#1D4ED8";
      };

      const baseColor = getColor();
      
      // FIXED: Safer dataset configuration to prevent Chart.js errors
      const datasetConfig = {
        label: `${parameterName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} (${unit || ""})`,
        data: processedData,
        borderColor: baseColor,
        backgroundColor: chartType === "line" ? `${baseColor}20` : `${baseColor}80`,
        tension: chartType === "line" ? 0.4 : 0,
      };

      // Add chart-type specific properties
      if (chartType === "line") {
        Object.assign(datasetConfig, {
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: baseColor,
          pointBorderColor: isDark ? "#FFFFFF" : "#000000",
          pointBorderWidth: 2,
          borderWidth: 2,
        });
      } else {
        Object.assign(datasetConfig, {
          borderRadius: 6,
          borderSkipped: false,
          borderWidth: 1,
        });
      }

      return {
        datasets: [datasetConfig],
      };
    },
    [],
  );

  // FIXED: Enhanced chart options with proper time configuration that respects custom date ranges
  const chartOptions = useCallback(
    (paramName = "") => {
      const lowerCaseParamName = paramName.toLowerCase();
      const isDbm = DBM_NAMES.some((name) => lowerCaseParamName.includes(name.toLowerCase()));
      
      let yAxisSettings = {
        beginAtZero: true,
      };
      
      if (isDbm) {
        yAxisSettings = {
          reverse: true,
          min: -120,
          max: 0,
          beginAtZero: false,
        };
      }

      const getTimeConfig = () => {
        const baseConfig = {
          type: "time",
          grid: {
            color: isDarkMode ? "rgba(75, 85, 99, 0.3)" : "rgba(209, 213, 219, 0.4)",
            drawBorder: false,
          },
          ticks: {
            color: isDarkMode ? "#D1D5DB" : "#4B5563",
            font: {
              size: 12,
            },
            maxRotation: 45,
            minRotation: 0,
          },
        };

        // FIXED: Proper time configuration for different ranges, including custom date ranges
        if (customStartDate && customEndDate) {
          // FIXED: For custom date ranges (months), set time bounds
          const daysDiff = Math.ceil((new Date(customEndDate) - new Date(customStartDate)) / (1000 * 60 * 60 * 24));
          
          console.log(`📊 Chart time config for custom range: ${daysDiff} days`);
          
          // Set the time bounds to match the selected date range
          baseConfig.min = customStartDate;
          baseConfig.max = customEndDate;
          
          if (daysDiff <= 1) {
            baseConfig.time = {
              unit: "hour",
              stepSize: 2,
              displayFormats: { hour: "HH:mm" },
              tooltipFormat: "MMM d, HH:mm",
            };
            baseConfig.ticks = {
              ...baseConfig.ticks,
              source: 'auto',
              autoSkip: true,
              maxTicksLimit: 12,
            };
          } else if (daysDiff <= 7) {
            baseConfig.time = {
              unit: "day",
              stepSize: 1,
              displayFormats: { day: "EEE d" },
              tooltipFormat: "EEEE, MMM d",
            };
            baseConfig.ticks = {
              ...baseConfig.ticks,
              source: 'data',
              autoSkip: false,
              maxTicksLimit: 7,
            };
          } else if (daysDiff <= 31) {
            baseConfig.time = {
              unit: "day",
              stepSize: Math.max(1, Math.ceil(daysDiff / 8)), // Show ~8 ticks max
              displayFormats: { day: "MMM d" },
              tooltipFormat: "MMM d, yyyy",
            };
            baseConfig.ticks = {
              ...baseConfig.ticks,
              source: 'auto',
              autoSkip: true,
              maxTicksLimit: 8,
            };
          } else {
            baseConfig.time = {
              unit: "week",
              stepSize: 1,
              displayFormats: { week: "MMM d" },
              tooltipFormat: "MMM d, yyyy",
            };
            baseConfig.ticks = {
              ...baseConfig.ticks,
              source: 'auto',
              autoSkip: true,
              maxTicksLimit: 6,
            };
          }
        } else if (selectedRange === "weekly") {
          baseConfig.time = {
            unit: "day",
            stepSize: 1,
            displayFormats: { 
              day: "EEE" // Mon, Tue, Wed, etc.
            },
            tooltipFormat: "EEEE, MMM d",
          };
          // Ensure we show all days
          baseConfig.ticks = {
            ...baseConfig.ticks,
            source: 'data',
            autoSkip: false,
            maxTicksLimit: 7, // Show all 7 days
          };
        } else if (selectedRange === "monthly") {
          baseConfig.time = {
            unit: "day",
            stepSize: 3,
            displayFormats: { 
              day: "MMM d" 
            },
            tooltipFormat: "MMM d, yyyy",
          };
          baseConfig.ticks = {
            ...baseConfig.ticks,
            source: 'auto',
            autoSkip: true,
            maxTicksLimit: 10,
          };
        } else {
          // Daily
          baseConfig.time = {
            unit: "hour",
            stepSize: 2,
            displayFormats: { 
              hour: "HH:mm" 
            },
            tooltipFormat: "MMM d, HH:mm",
          };
        }

        return baseConfig;
      };

      // FIXED: Safer chart options to prevent plugin errors
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: isDarkMode ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)",
            titleColor: isDarkMode ? "#F9FAFB" : "#111827",
            bodyColor: isDarkMode ? "#E5E7EB" : "#374151",
            borderColor: isDarkMode ? "#3B82F6" : "#2563EB",
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            padding: 12,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null && typeof context.parsed.y === "number") {
                  label += context.parsed.y.toFixed(2);
                }
                return label;
              },
              title: (context) => {
                if (context[0]?.parsed?.x) {
                  const date = new Date(context[0].parsed.x);
                  if (selectedRange === "weekly") {
                    return format(date, "EEEE, MMM d");
                  } else if (customStartDate && customEndDate) {
                    return format(date, "MMM d, yyyy HH:mm");
                  }
                  return format(date, "MMM d, HH:mm");
                }
                return "";
              },
            },
          },
        },
        layout: {
          padding: {
            left: 6,
            right: 6,
            top: 15,
            bottom: 6,
          },
        },
        scales: {
          x: getTimeConfig(),
          y: {
            ...yAxisSettings,
            grid: {
              color: isDarkMode ? "rgba(75, 85, 99, 0.3)" : "rgba(209, 213, 219, 0.4)",
              drawBorder: false,
            },
            ticks: {
              color: isDarkMode ? "#D1D5DB" : "#4B5563",
              font: {
                size: 12,
              },
              callback: (value) => {
                if (isDbm) {
                  return value + " dBm";
                }
                return typeof value === "number" ? value.toFixed(1) : value;
              },
            },
          },
        },
        // FIXED: Safer animation configuration
        animation: {
          duration: 300,
          easing: "easeInOutQuad",
        },
      };
    },
    [isDarkMode, selectedRange, customStartDate, customEndDate],
  );

  // Enhanced chart download function
  const handleDownloadChart = useCallback(
    (chartName, parameterName) => {
      try {
        const chartInstance = chartInstancesRef.current.get(parameterName);
        if (chartInstance && typeof chartInstance.toBase64Image === "function") {
          const imageUrl = chartInstance.toBase64Image("image/png", 1.0);
          const link = document.createElement("a");
          link.href = imageUrl;
          const displayChartName =
            chartName === "level" ? "Liquid_Depth" : chartName.replace(/_/g, "_");
          const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
          link.download = `${device?.name || device?.type || "Device"}_${displayChartName}_${selectedRange}_${timestamp}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(`${displayChartName} chart downloaded successfully!`);
        } else {
          toast.error("Unable to download chart. Chart may not be fully loaded.");
        }
      } catch (error) {
        console.error("Error downloading chart:", error);
        toast.error("Failed to download chart. Please try again.");
      }
    },
    [device, selectedRange],
  );

  // Helper function to get unit for parameter
  const getUnitForParameter = useCallback((paramName) => {
    if (GAUGE_PARAMETERS_CONFIG[paramName]) {
      return GAUGE_PARAMETERS_CONFIG[paramName].unit;
    }
    switch (paramName) {
      case "temperature":
        return "°C";
      case "humidity":
        return "%";
      case "pm25":
      case "pm10":
      case "ozone":
        return "µg/m³";
      case "co2":
        return "ppm";
      case "atmosphericPressure":
        return "hPa";
      case "windSpeed":
        return "m/s";
      case "windDir":
        return "°";
      case "rainfall":
        return "mm";
      case "totalSolarRadiation":
        return "W/m²";
      case "noise":
        return "dB";
      case "level":
        return "M";
      case "signalStrength":
        return "dBm";
      case "signal_rssi_raw":
        return "";
      case "batteryLevel":
        return "%";
      default:
        return "";
    }
  }, []);

  // FIXED: Enhanced data availability check with better external API data detection
  const hasDataForVisualization = useCallback(
    (paramName) => {
      console.log(`🔍 Checking data availability for ${paramName} (device type: ${device?.type})`);
      
      // Check current sensor data
      const hasCurrentData =
        currentSensorData[paramName] !== undefined &&
        currentSensorData[paramName] !== null &&
        typeof currentSensorData[paramName] === "number";

      console.log(`📊 Current data for ${paramName}:`, currentSensorData[paramName]);

      // Check analytics data (external API format)
      let hasAnalyticsData = false;
      if (analyticsData) {
        // Check external API parameter mapping
        const externalParamName = getExternalApiParameterName(paramName);
        console.log(`🔍 Checking external param name: ${externalParamName} for device type: ${device?.type}`);
        
        if (Array.isArray(analyticsData[externalParamName])) {
          const validValues = analyticsData[externalParamName].filter(v => v !== 0 && v !== null && v !== undefined);
          hasAnalyticsData = validValues.length > 0;
          console.log(`📊 External API data for ${paramName} (${externalParamName}) on ${device?.type}:`, analyticsData[externalParamName], 'Valid values:', validValues.length);
        }
        
        // Also check direct parameter name
        if (!hasAnalyticsData && analyticsData[paramName] !== undefined) {
          hasAnalyticsData = true;
          console.log(`📊 Direct parameter data for ${paramName} on ${device?.type}:`, analyticsData[paramName]);
        }
        
        // Check if it's in processed array format
        if (!hasAnalyticsData && Array.isArray(analyticsData)) {
          hasAnalyticsData = analyticsData.some((item) => item[paramName] !== undefined);
          console.log(`📊 Array format data for ${paramName} on ${device?.type}:`, hasAnalyticsData);
        }
      }

      // FIXED: Check range data for both array and object formats
      let hasRangeData = false;
      if (historicalRangeData && historicalRangeData.data) {
        // Check external API format in historical range data
        const externalParamName = getExternalApiParameterName(paramName);
        if (Array.isArray(historicalRangeData.data[externalParamName])) {
          const validValues = historicalRangeData.data[externalParamName].filter(v => v !== 0 && v !== null && v !== undefined);
          hasRangeData = validValues.length > 0;
          console.log(`📊 Historical range external API data for ${paramName}:`, validValues.length, 'valid values');
        }
        
        // Check legacy array format
        if (!hasRangeData && Array.isArray(historicalRangeData)) {
          hasRangeData = historicalRangeData.some(
            (item) => item[`avg${paramName.charAt(0).toUpperCase() + paramName.slice(1)}`] !== undefined,
          );
        }
      }

      const result = hasCurrentData || hasAnalyticsData || hasRangeData;
      
      console.log(`✅ Data availability for ${paramName} on ${device?.type}:`, {
        hasCurrentData,
        hasAnalyticsData,
        hasRangeData,
        result
      });

      return result;
    },
    [currentSensorData, analyticsData, historicalRangeData, device?.type],
  );

  // FIXED: Get best available value with improved external API data extraction
  const getBestAvailableValue = useCallback(
    (paramName) => {
      console.log(`🎯 Getting best available value for ${paramName} (device type: ${device?.type})`);
      
      // Try realtime data first
      if (realtimeSensorData && realtimeSensorData[paramName] !== undefined && realtimeSensorData[paramName] !== null) {
        console.log(`🔴 Using realtime data: ${realtimeSensorData[paramName]}`);
        return realtimeSensorData[paramName];
      }

      // Try current sensor data
      if (currentSensorData[paramName] !== undefined && currentSensorData[paramName] !== null) {
        console.log(`🟡 Using current sensor data: ${currentSensorData[paramName]}`);
        return currentSensorData[paramName];
      }

      // Try analytics data with external API mapping
      if (analyticsData) {
        const externalParamName = getExternalApiParameterName(paramName);
        
        // Check external API format (arrays)
        if (Array.isArray(analyticsData[externalParamName])) {
          const validValues = analyticsData[externalParamName].filter(v => v !== 0 && v !== null && v !== undefined);
          if (validValues.length > 0) {
            const latestValue = validValues[validValues.length - 1];
            console.log(`🟢 Using external API data (${externalParamName}) for ${device?.type}: ${latestValue}`);
            return latestValue;
          }
        }
        
        // Check direct parameter in analytics
        if (analyticsData[paramName] !== undefined && analyticsData[paramName] !== null) {
          console.log(`🟣 Using direct analytics data: ${analyticsData[paramName]}`);
          return analyticsData[paramName];
        }

        // Check if analytics data is an array
        if (Array.isArray(analyticsData) && analyticsData.length > 0) {
          const latestData = analyticsData[analyticsData.length - 1] || analyticsData[0];
          if (latestData && latestData[paramName] !== undefined) {
            console.log(`🔵 Using array analytics data: ${latestData[paramName]}`);
            return latestData[paramName];
          }
        }

        // Check average values (fallback)
        const avgParamName = `avg${paramName.charAt(0).toUpperCase() + paramName.slice(1)}`;
        if (analyticsData[avgParamName] !== undefined) {
          console.log(`⚪ Using average value: ${analyticsData[avgParamName]}`);
          return analyticsData[avgParamName];
        }
      }

      // Try cached WebSocket data
      if (getDeviceSensorData && deviceId) {
        const cachedData = getDeviceSensorData(deviceId);
        if (cachedData && cachedData[paramName] !== undefined && cachedData[paramName] !== null) {
          console.log(`🔶 Using cached WebSocket data: ${cachedData[paramName]}`);
          return cachedData[paramName];
        }
      }

      console.log(`❌ No data found for ${paramName} on device type ${device?.type}`);
      return null;
    },
    [realtimeSensorData, currentSensorData, analyticsData, getDeviceSensorData, deviceId, device?.type],
  );

  // Enhanced visualization rendering
  const renderVisualizationForParameter = useCallback(
    (paramName, value, isDarkMode, displayParamName) => {
      const processedValue = getBestAvailableValue(paramName) || value;
      const isSignalParameter =
        DBM_NAMES.some((name) => paramName.toLowerCase().includes(name.toLowerCase())) ||
        RAW_RSSI_NAMES.some((name) => paramName.toLowerCase().includes(name.toLowerCase()));
      const isGaugeParameter = GAUGE_PARAMETERS_CONFIG[paramName] && GAUGE_PARAMETERS_CONFIG[paramName].zones;
      const hasData = hasDataForVisualization(paramName);
      const chartData = getChartDataForParameter(paramName);
      const hasChartData = chartData && chartData.length > 0;

      console.log(`🎨 Rendering visualization for ${paramName} on ${device?.type}:`, {
        hasData,
        hasChartData,
        chartDataLength: chartData?.length,
        bestValue: processedValue,
        selectedRange,
        isGaugeParameter,
      });

      // GAUGES: For daily range with gauge parameters when no chart data or when we have single value
      if (selectedRange === "daily" && isGaugeParameter && hasData && (!hasChartData || typeof processedValue === 'number')) {
        const config = GAUGE_PARAMETERS_CONFIG[paramName];
        return (
          <div className="h-64 w-full flex justify-center items-center">
            <EnhancedGauge
              value={processedValue}
              min={config.min}
              max={config.max}
              unit={config.unit}
              label={displayParamName}
              zones={config.zones}
              isDarkMode={isDarkMode}
              size="medium"
              showAnimation={false} // Disabled to prevent Chart.js conflicts
            />
          </div>
        );
      }

      // CHARTS: When we have chart data
      if (hasChartData) {
        const chartType = selectedRange === "daily" ? "bar" : "line";
        const chartDataFormatted = getChartData(
          chartData,
          paramName,
          getUnitForParameter(paramName),
          isDarkMode,
          chartType,
        );
        const chartOptionsConfig = chartOptions(paramName);
        const ChartComponent = chartType === "line" ? Line : Bar;

        return (
          <div className="h-64 w-full">
            <ChartComponent
              ref={(ref) => {
                if (ref) {
                  chartInstancesRef.current.set(paramName, ref);
                }
              }}
              data={chartDataFormatted}
              options={chartOptionsConfig}
              redraw={false}
            />
          </div>
        );
      }

      // FALLBACK: Simple value display
      if (hasData && typeof processedValue === "number") {
        const config = GAUGE_PARAMETERS_CONFIG[paramName];
        const bgColor = config ? "from-blue-500 to-indigo-500" : "from-gray-500 to-slate-500";

        return (
          <div className="h-64 w-full flex justify-center items-center">
            <div
              className={`bg-gradient-to-br ${bgColor} rounded-xl p-8 shadow-lg text-center min-w-[200px]`}
            >
              <div className="text-4xl font-bold text-white mb-2">{processedValue.toFixed(2)}</div>
              <div className="text-lg text-white opacity-90 mb-1">{getUnitForParameter(paramName)}</div>
              <div className="text-sm text-white opacity-75">Current Reading</div>
              <div className="text-xs text-white opacity-60 mt-1">Device: {device?.type}</div>
            </div>
          </div>
        );
      }

      // NO DATA: Fallback
      return (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400 italic">
          <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No data available for {displayParamName}</p>
          <p className="text-xs mt-1">Device Type: {device?.type}</p>
          <p className="text-xs mt-1">External param: {getExternalApiParameterName(paramName)}</p>
        </div>
      );
    },
    [
      hasDataForVisualization,
      getBestAvailableValue,
      getChartDataForParameter,
      selectedRange,
      isDarkMode,
      getChartData,
      chartOptions,
      getUnitForParameter,
      device?.type,
    ],
  );

  // FIXED: Available parameters based on device type and current data
  const availableParameters = useMemo(() => {
    console.log(`🔍 Computing available parameters for device type: ${device?.type}`);
    console.log("📊 Current sensor data keys:", Object.keys(currentSensorData));
    
    if (!device?.type) {
      // If no device type, use all non-graphable parameters from current sensor data
      const params = Object.keys(currentSensorData).filter(
        (paramName) =>
          !NON_GRAPHABLE_PARAMETERS.includes(paramName) &&
          (typeof currentSensorData[paramName] === "number" || paramName.includes("signal"))
      );
      console.log("📊 No device type - using current sensor data params:", params);
      return params;
    }
    
    // Get device-specific parameters
    const deviceSpecificParams = getParametersForDeviceType(device.type);
    console.log(`📊 Device-specific parameters for ${device.type}:`, deviceSpecificParams);
    
    // Filter to only include parameters that have data
    const availableParams = deviceSpecificParams.filter(paramName => {
      const hasData = hasDataForVisualization(paramName);
      console.log(`📊 Parameter ${paramName} has data for ${device.type}: ${hasData}`);
      return hasData;
    });
    
    console.log(`✅ Final available parameters for ${device.type}:`, availableParams);
    return availableParams;
  }, [currentSensorData, device?.type, hasDataForVisualization]);

  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);
  }, [getUserRole]);

  // Dark mode detection
  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (realtimeSensorData && deviceId) {
      console.log(`📊 [DeviceDetails] Real-time sensor data received for ${device?.type}:`, realtimeSensorData);

      setCurrentSensorData((prevData) => {
        const newData = {
          ...prevData,
          ...realtimeSensorData,
          last_updated: realtimeSensorData.timestamp || new Date().toISOString(),
        };

        console.log(`📊 [DeviceDetails] Updated current sensor data for ${device?.type}:`, newData);
        return newData;
      });

      lastRealTimeUpdateRef.current = Date.now();

      if (fetchHistoricalDataDebounceRef.current) {
        clearTimeout(fetchHistoricalDataDebounceRef.current);
      }

      fetchHistoricalDataDebounceRef.current = setTimeout(() => {
        console.log(`📊 [DeviceDetails] Refreshing analytics due to real-time update for ${device?.type}`);
        if (customStartDate && customEndDate) {
          fetchHistoricalRange();
        } else {
          fetchHistoricalAnalytics();
        }
      }, 1000);
    }
  }, [realtimeSensorData, deviceId, device?.type, fetchHistoricalAnalytics, fetchHistoricalRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (!deviceId || !subscribeToDevice) {
      return;
    }

    console.log(`📡 [DeviceDetails] Subscribing to real-time updates for device: ${deviceId} (${device?.type})`);

    const unsubscribe = subscribeToDevice(deviceId, (sensorData) => {
      console.log(`📊 [DeviceDetails] Direct device subscription data received for ${device?.type}:`, sensorData);

      setCurrentSensorData((prevData) => ({
        ...prevData,
        ...sensorData,
        last_updated: sensorData.timestamp || new Date().toISOString(),
      }));

      if (fetchHistoricalDataDebounceRef.current) {
        clearTimeout(fetchHistoricalDataDebounceRef.current);
      }

      fetchHistoricalDataDebounceRef.current = setTimeout(() => {
        console.log(`📊 [DeviceDetails] Refreshing analytics due to subscription update for ${device?.type}`);
        if (customStartDate && customEndDate) {
          fetchHistoricalRange();
        } else {
          fetchHistoricalAnalytics();
        }
      }, 1000);
    });

    return () => {
      console.log(`📡 [DeviceDetails] Unsubscribing from device: ${deviceId} (${device?.type})`);
      unsubscribe();
      if (fetchHistoricalDataDebounceRef.current) {
        clearTimeout(fetchHistoricalDataDebounceRef.current);
      }
    };
  }, [deviceId, subscribeToDevice, device?.type, fetchHistoricalAnalytics, fetchHistoricalRange, customStartDate, customEndDate]);

  // Effect hooks
  useEffect(() => {
    fetchDeviceDetails();
  }, [fetchDeviceDetails]);

  // FIXED: Use the enhanced method that includes device type
  useEffect(() => {
    if (device && !loading && cookies.token) {
      console.log(`Device loaded, fetching analytics for device type: ${device.type}`, device);
      fetchLatestAnalyticsWithDeviceType();
    }
  }, [device, loading, cookies.token, fetchLatestAnalyticsWithDeviceType]);

  // FIXED: Fetch data when parameters or range changes - improved with better date handling
  useEffect(() => {
    if (device?.type && device?.serialNumber) {
      if (fetchHistoricalDataDebounceRef.current) {
        clearTimeout(fetchHistoricalDataDebounceRef.current);
      }
      fetchHistoricalDataDebounceRef.current = setTimeout(() => {
        console.log(
          `🔄 Triggering data fetch for charts. Device type: ${device.type}, Serial: ${device.serialNumber}`,
        );
        console.log(`📅 Custom date range:`, { customStartDate, customEndDate });
        
        if (customStartDate && customEndDate) {
          console.log(`🔄 Fetching historical range data`);
          fetchHistoricalRange();
        } else {
          console.log(`🔄 Fetching historical analytics for range: ${selectedRange}`);
          fetchHistoricalAnalytics();
        }
      }, 300);
      return () => {
        if (fetchHistoricalDataDebounceRef.current) {
          clearTimeout(fetchHistoricalDataDebounceRef.current);
        }
      };
    }
  }, [
    device?.type,
    device?.serialNumber,
    selectedRange,
    customStartDate,
    customEndDate,
    fetchHistoricalAnalytics,
    fetchHistoricalRange,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fetchHistoricalDataDebounceRef.current) {
        clearTimeout(fetchHistoricalDataDebounceRef.current);
      }
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
      chartInstancesRef.current.clear();
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <Activity className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-xl text-gray-700 dark:text-white">Loading device details...</p>
        </div>
      </div>
    );
  }

  // Device not found state
  if (!device) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <p className="text-xl text-gray-700 dark:text-white">Device not found.</p>
          {messageBox && <MessageBox {...messageBox} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-3 sm:p-6">
      {/* Enhanced Header with WebSocket Status and System Monitoring - Improved Mobile */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <div
              className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg ${
                isConnected
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-2 border-green-300 dark:border-green-700"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-2 border-red-300 dark:border-red-700"
              }`}
            >
              {isConnected ? <Wifi className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse" /> : <WifiOff className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span className="text-xs sm:text-sm">{isConnected ? "Real-time Connected" : "Real-time Disconnected"}</span>
            </div>

            {/* Display device type in header - Mobile optimized */}
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 sm:px-3 rounded-full shadow text-center">
              Device Type: <span className="font-semibold text-blue-600 dark:text-blue-400">{device.type}</span>
            </div>

            {realtimeLastUpdate && (
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 sm:px-3 rounded-full shadow text-center">
                Last update: {format(new Date(realtimeLastUpdate), 'MMM d, HH:mm')}
              </div>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || realtimeLoading}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
          >
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="font-semibold">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* System Monitoring Widget for Admins - Mobile optimized */}
      {userRole === "admin" && (
        <div className="mb-4 sm:mb-6">
          <SystemMonitoringWidget showDetails={false} className="w-full" />
        </div>
      )}

      {/* Enhanced Device Info Cards - Improved Mobile Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg mr-3">
              <GaugeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Device Information</h3>
          </div>
          <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-lg space-y-1 sm:space-y-0">
              <strong className="font-semibold text-blue-600 dark:text-blue-400">Serial:</strong>
              <span className="font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 sm:px-3 rounded-lg text-xs sm:text-sm text-gray-800 dark:text-white shadow break-all">
                {device.serialNumber}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-lg space-y-1 sm:space-y-0">
              <strong className="font-semibold text-blue-600 dark:text-blue-400">Type:</strong>
              <span className="text-gray-800 dark:text-white font-medium bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 sm:px-3 rounded-lg">
                {device.type}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-lg space-y-1 sm:space-y-0">
              <strong className="font-semibold text-blue-600 dark:text-blue-400">Location:</strong>
              <span className="text-gray-800 dark:text-white font-medium break-words">{device.location || "N/A"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-lg space-y-1 sm:space-y-0">
              <strong className="font-semibold text-blue-600 dark:text-blue-400">Status:</strong>
              <span
                className={`font-bold px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm shadow ${
                  device.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {device.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg mr-3">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
              Current Readings ({device.type})
            </h3>
          </div>
          {Object.keys(currentSensorData).length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(currentSensorData)
                .filter(([key, value]) => {
                  // Enhanced filtering to exclude version and other non-graphable parameters
                  const isNonGraphable = NON_GRAPHABLE_PARAMETERS.includes(key);
                  const isNumeric = typeof value === "number";
                  return !isNonGraphable && isNumeric;
                })
                .map(([key, value], index) => (
                  <div
                    key={index}
                    className="p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-700/50 dark:to-purple-900/20 rounded-lg border border-gray-200/50 dark:border-gray-600/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                      <div>
                        <strong className="font-semibold text-purple-600 dark:text-purple-400 text-sm sm:text-base">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </strong>
                        <span className="text-gray-600 dark:text-gray-300 ml-2 text-xs sm:text-sm">({getUnitForParameter(key)})</span>
                      </div>
                      <div className="text-lg font-bold text-gray-800 dark:text-white">
                        {typeof value === "number" ? value.toFixed(2) : value}
                      </div>
                    </div>
                  </div>
                ))}
              {currentSensorData.last_updated && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                  Last updated: {format(new Date(currentSensorData.last_updated), 'MMM d, yyyy HH:mm:ss')}
                </div>
              )}
              {currentSensorData.errorCode > 0 && (
                <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200/50 dark:border-red-700/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                    <div>
                      <strong className="font-semibold text-red-600 dark:text-red-400">Error Code:</strong>
                    </div>
                    <div className="text-lg font-bold text-red-800 dark:text-red-300">
                      {currentSensorData.errorCode}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <p className="text-gray-600 dark:text-gray-300 italic text-sm sm:text-base">
                No current readings available for {device.type}.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                <p>Device ID: {deviceId}</p>
                <p>Serial: {device?.serialNumber}</p>
                <p>Device Type: {device?.type}</p>
                <div>
                  <button 
                    onClick={() => fetchLatestAnalyticsWithDeviceType()}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                  >
                    Retry Loading Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Section Header - Mobile optimized */}
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-lg">
          Sensor Data Visualization - {device.type}
        </h3>
        <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 mx-auto rounded-full shadow-lg"></div>
      </div>

      {/* Enhanced Time Range Selector with Month Options - Mobile optimized */}
      <MonthSelector
        onDateRangeChange={handleDateRangeChange}
        selectedRange={selectedRange}
        setSelectedRange={setSelectedRange}
      />

      {/* Display current date range if custom dates are set - Mobile optimized */}
      {customStartDate && customEndDate && (
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs sm:text-sm">
            <Calendar size={14} className="sm:w-4 sm:h-4" />
            <span className="text-center">
              Showing data from {format(customStartDate, 'MMM d, yyyy')} to {format(customEndDate, 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      )}

      {/* Sensor Data Charts Grid - Improved Mobile Layout */}
      {sensorDataLoading ? (
        <div className="flex items-center justify-center p-8 sm:p-12">
          <div className="text-center">
            <Activity className="animate-spin h-8 w-8 sm:h-12 sm:w-12 text-blue-500 mx-auto mb-4" />
            <p className="text-lg sm:text-xl text-blue-600 dark:text-blue-400 font-medium">
              Loading sensor data for {device.type}...
            </p>
          </div>
        </div>
      ) : availableParameters.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {availableParameters.map((paramName) => {
            const displayParamName =
              paramName === "level"
                ? "Liquid Depth"
                : paramName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

            const contentToRender = renderVisualizationForParameter(
              paramName,
              currentSensorData[paramName],
              isDarkMode,
              displayParamName,
            );

            const currentValue = currentSensorData[paramName];
            const unit = getUnitForParameter(paramName);
            const bestValue = getBestAvailableValue(paramName);

            const processedValue = bestValue || currentValue;
            const chartData = getChartDataForParameter(paramName);
            const showDownloadButton = chartData && chartData.length > 0 && paramName !== "level";

            return (
              <div
                key={paramName}
                className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] flex flex-col min-h-[350px] sm:min-h-[400px]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <h4 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white capitalize">
                      {displayParamName} ({unit})
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Device Type: {device.type}
                    </p>
                  </div>
                  {showDownloadButton && (
                    <button
                      onClick={() => handleDownloadChart(paramName, paramName)}
                      className="self-start sm:self-center p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 rounded-lg border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-700 group"
                      aria-label={`Download ${displayParamName} chart`}
                      title="Download Chart"
                    >
                      <Download size={16} className="sm:w-[18px] sm:h-[18px] group-hover:scale-110 transition-transform duration-200" />
                    </button>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center">{contentToRender}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12 text-gray-600 dark:text-gray-400 italic">
          <Activity className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4 opacity-50" />
          <p className="text-lg sm:text-xl">No sensor data available for this {device.type} device.</p>
          <div className="text-xs sm:text-sm mt-2 space-y-1 max-w-md mx-auto">
            <p>Device ID: {deviceId}</p>
            <p>Serial: {device?.serialNumber}</p>
            <p>Device Type: {device?.type}</p>
            <p className="break-all">Available data keys: {Object.keys(currentSensorData).join(", ") || "None"}</p>
            <p className="break-all">Expected parameters: {getParametersForDeviceType(device?.type || "").join(", ")}</p>
          </div>
        </div>
      )}

      {messageBox && <MessageBox {...messageBox} />}
    </div>
  );
};

export default DeviceDetailsPage;