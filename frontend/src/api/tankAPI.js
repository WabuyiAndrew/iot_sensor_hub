// frontend/api/tankAPI.js
import { createHeaders, handleResponse } from "./apiUtils";

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_API_BASE_URL_PROD
  : process.env.NEXT_PUBLIC_API_BASE_URL_DEV;

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api'; // Fallback to your backend's default port

// Function to fetch all tank types (configurations)
export const getTankTypes = async () => { // RENAMED: getTanks -> getTankTypes
  try {
    const response = await fetch(`${BASE_URL}/api/tank-types`, {
      method: "GET",
      headers: createHeaders(),
      credentials: "include",
    });
    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error("Error fetching tank types:", error); // Updated log
    throw error;
  }
};

// Function to fetch overview status for all tanks from the backend
export const getTankTypesOverviewStatus = async () => { // RENAMED: getTanksOverviewStatus -> getTankTypesOverviewStatus
  try {
    const response = await fetch(`${BASE_URL}/api/tank-types/overview-status`, {
      method: "GET",
      headers: createHeaders(),
      credentials: "include",
    });
    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error("Error fetching tank types overview status:", error); // Updated log
    throw error;
  }
};

// Function to fetch a single tank type by ID
export const getTankTypeById = async (id) => { // RENAMED: getTankById -> getTankTypeById
  try {
    const response = await fetch(`${BASE_URL}/api/tank-types/${id}`, {
      method: "GET",
      headers: createHeaders(),
      credentials: "include",
    });
    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error(`Error fetching tank type with ID ${id}:`, error); // Updated log
    throw error;
  }
};

// Function to create a new tank type
export const createTankType = async (tankData) => { // RENAMED: createTank -> createTankType
  try {
    const response = await fetch(`${BASE_URL}/api/tank-types`, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify(tankData),
      credentials: "include",
    });
    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error("Error creating tank type:", error); // Updated log
    throw error;
  }
};

// Function to update an existing tank type
export const updateTankType = async ({ id, updates }) => { // RENAMED: updateTank -> updateTankType
  try {
    const response = await fetch(`${BASE_URL}/api/tank-types/${id}`, {
      method: "PUT",
      headers: createHeaders(),
      body: JSON.stringify(updates),
      credentials: "include",
    });
    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error(`Error updating tank type with ID ${id}:`, error); // Updated log
    throw error;
  }
};

// Function to delete a tank type
export const deleteTankType = async (id) => { // RENAMED: deleteTank -> deleteTankType
  try {
    const response = await fetch(`${BASE_URL}/api/tank-types/${id}`, {
      method: "DELETE",
      headers: createHeaders(),
      credentials: "include",
    });
    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error(`Error deleting tank type with ID ${id}:`, error); // Updated log
    throw error;
  }
};

// Function to record a volume reading (typically used by devices/gateways)
export const recordVolumeReading = async (tankId, sensorData, rawSensorData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/tank-types/${tankId}/volume-reading`, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        deviceId: sensorData.deviceId,
        rawSensorReading: rawSensorData,
        timestamp: sensorData.timestamp || new Date().toISOString(),
        dataQuality: sensorData.dataQuality || "good",
      }),
      credentials: "include",
    });
    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error(`Error recording volume reading for tank ${tankId}:`, error);
    throw error;
  }
};

// Function to get volume history for a specific tank
export const getTankVolumeHistory = async (tankId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  try {
    const response = await fetch(`${BASE_URL}/api/tank-types/${tankId}/volume-history?${query}`, {
      method: "GET",
      headers: createHeaders(),
      credentials: "include",
    });
    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error(`Error fetching volume history for tank ${tankId}:`, error);
    throw error;
  }
};
