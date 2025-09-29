// frontend/api/apiUtils.js

/**
 * Creates standard headers for API requests, including Authorization token from cookies.
 * @returns {HeadersInit} The headers object.
 */
export const createHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };

  // Manually parse the 'token' cookie from document.cookie
  const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
    const [name, value] = cookie.split('=');
    acc[name] = value;
    return acc;
  }, {});

  const token = cookies.token; // Get the token directly from the parsed cookies

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn("No authentication token found in cookies for API request.");
  }

  return headers;
};

/**
 * Handles the response from a fetch API call.
 * Throws an error if the response is not OK.
 * @param {Response} response The fetch API response object.
 * @returns {Promise<any>} The parsed JSON data from the response.
 * @throws {Error} If the response status is not OK.
 */
export const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, or parsing fails
      errorData = { message: response.statusText || "Something went wrong", status: response.status };
    }

    // Log the full error response for debugging
    console.error(`API Error: ${response.status} ${response.statusText}`, errorData);

    // Construct a more informative error message
    const errorMessage = errorData.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorData; // Attach the error data for potential component-level handling
    throw error;
  }
  return response.json();
};
