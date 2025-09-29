// src/api/api.js
const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api'; // Your Node.js backend URL

// Function to get the JWT token from localStorage (or wherever you store it)
const getToken = () => localStorage.getItem('jwtToken');

// Generic API call function
const apiCall = async (endpoint, method = 'GET', data = null) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);

        // Handle 401 Unauthorized globally
        if (response.status === 401 || response.status === 403) {
            console.error('Authentication or Authorization failed. Redirecting to login.');
            // Implement your logout/redirect logic here
            // For now, let's just clear token and refresh
            localStorage.removeItem('jwtToken');
            window.location.reload(); // Simple reload to force re-auth
            return null; // Prevent further processing
        }

        const responseData = await response.json();

        if (!response.ok) {
            // If response is not OK (e.g., 400, 500), throw an error with the response data
            const errorMessage = responseData.message || response.statusText || 'Something went wrong';
            throw new Error(errorMessage);
        }

        return responseData;
    } catch (error) {
        console.error('API call error:', error);
        throw error; // Re-throw to be caught by calling component
    }
};

// --- Authentication API Calls ---
export const login = async (username, password) => apiCall('/users/login', 'POST', { username, password });
export const getProfile = async () => apiCall('/users/profile');

// --- Device API Calls ---
export const getAllDevices = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/devices${queryParams ? `?${queryParams}` : ''}`);
};
export const getDeviceById = async (id) => apiCall(`/devices/${id}`);
export const createDevice = async (deviceData) => apiCall('/devices', 'POST', deviceData);
export const updateDevice = async (id, deviceData) => apiCall(`/devices/${id}`, 'PUT', deviceData);
export const deleteDevice = async (id) => apiCall(`/devices/${id}`, 'DELETE');
export const getMyDevicesSensorData = async () => apiCall('/devices/my-devices-sensor-data');
export const getDeviceHistory = async (deviceId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/devices/${deviceId}/data${queryParams ? `?${queryParams}` : ''}`);
};
export const getLatestSensorData = async (deviceId) => apiCall(`/devices/${deviceId}/latest`);
export const getDeviceStats = async () => apiCall('/devices/stats');
export const getWaterTankDevices = async () => apiCall('/devices/water-tank');
export const getUltrasonicLevel = async (deviceId) => apiCall(`/devices/${deviceId}/ultrasonic-level`);


// --- Tank Type API Calls ---
export const getAllTankTypes = async () => apiCall('/tank-types');
export const getTankTypeById = async (id) => apiCall('/tank-types/${id}');

// --- Sensor Data Ingestion (for testing, usually devices send directly) ---
export const sendRawSensorData = async (rawHexString) => apiCall('/sensor/raw-data', 'POST', { rawHexString });
