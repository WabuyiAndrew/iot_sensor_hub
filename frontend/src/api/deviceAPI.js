// // frontend/api/deviceAPI.js
// import { createHeaders, handleResponse } from "./apiUtils";

// const API_BASE_URL = process.env.NODE_ENV === 'production'
//   ? process.env.NEXT_PUBLIC_API_BASE_URL_PROD
//   : process.env.NEXT_PUBLIC_API_BASE_URL_DEV;

// const BASE_URL = API_BASE_URL || 'http://localhost:5000'; // Fallback to your backend's default port

// export const getDevices = async () => {
//   try {
//     const response = await fetch(`${BASE_URL}/api/devices`, {
//       method: "GET",
//       headers: createHeaders(),
//       credentials: "include",
//     });
//     const result = await handleResponse(response);
//     return result.data;
//   } catch (error) {
//     console.error("Error fetching devices:", error);
//     throw error;
//   }
// };

// export const getLiquidLevelDevices = async () => {
//   try {
//     const response = await fetch(`${BASE_URL}/api/devices?type=liquid_level`, {
//       method: "GET",
//       headers: createHeaders(),
//       credentials: "include",
//     });
//     const result = await handleResponse(response);
//     return result.data;
//   } catch (error) {
//     console.error("Error fetching liquid level devices:", error);
//     throw error;
//   }
// };

// export const getDeviceById = async (id) => {
//   try {
//     const response = await fetch(`${BASE_URL}/api/devices/${id}`, {
//       method: "GET",
//       headers: createHeaders(),
//       credentials: "include",
//     });
//     const result = await handleResponse(response);
//     return result.data;
//   } catch (error) {
//     console.error(`Error fetching device with ID ${id}:`, error);
//     throw error;
//   }
// };

// export const createDevice = async (deviceData) => {
//   try {
//     const response = await fetch(`${BASE_URL}/api/devices`, {
//       method: "POST",
//       headers: createHeaders(),
//       body: JSON.stringify(deviceData),
//       credentials: "include",
//     });
//     const result = await handleResponse(response);
//     return result.data;
//   } catch (error) {
//     console.error("Error creating device:", error);
//     throw error;
//   }
// };

// export const updateDevice = async ({ id, updates }) => {
//   try {
//     const response = await fetch(`${BASE_URL}/api/devices/${id}`, {
//       method: "PUT",
//       headers: createHeaders(),
//       body: JSON.stringify(updates),
//       credentials: "include",
//     });
//     const result = await handleResponse(response);
//     return result.data;
//   } catch (error) {
//     console.error(`Error updating device with ID ${id}:`, error);
//     throw error;
//   }
// };

// export const deleteDevice = async (id) => {
//   try {
//     const response = await fetch(`${BASE_URL}/api/devices/${id}`, {
//       method: "DELETE",
//       headers: createHeaders(),
//       credentials: "include",
//     });
//     const result = await handleResponse(response);
//     return result.data;
//   } catch (error) {
//     console.error(`Error deleting device with ID ${id}:`, error);
//     throw error;
//   }
// };

// export const getSensorData = async (deviceId) => {
//   try {
//     const response = await fetch(`${BASE_URL}/api/devices/${deviceId}/latest-sensor-data`, {
//       method: "GET",
//       headers: createHeaders(),
//       credentials: "include",
//     });
//     const result = await handleResponse(response);
//     return result.data;
//   } catch (error) {
//     console.error(`Error fetching latest sensor data for device ${deviceId}:`, error);
//     throw error;
//   }
// };
