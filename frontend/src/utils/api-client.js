// utils/api-client.js
// This file centralizes the base URL for your API.
// It allows you to easily switch between a local development server
// and a production server.

// Get the backend API URL from an environment variable.
// This is the best practice for production deployments.
// If the variable is not set, it defaults to a local development URL.
export const baseurl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5050";

console.log(`[api-client.js] Using API base URL: ${baseurl}`);