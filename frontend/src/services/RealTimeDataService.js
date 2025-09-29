// src/services/RealTimeDataService.js
import { API_BASE_URL } from '../../../config/api'; // Adjust path if your config file is elsewhere

class RealTimeDataService {
  constructor() {
    this.socket = null;
    this.subscriptions = {};
    this.pollingIntervals = {};
    // No direct use of API_BASE_URL here in the constructor,
    // as it might be evaluated too early during module loading.
    // It will be used safely within the connect method.
  }

  /**
   * Establishes a WebSocket connection to the backend.
   * Attempts to reconnect automatically on close.
   */
  connect() {
    // Only connect if no socket exists or if the existing one is closed
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      // Construct the WebSocket URL from the HTTP API base URL
      // Replace 'http' with 'ws' (or 'https' with 'wss' for secure connections)
      const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
      console.log(`Attempting to connect to WebSocket at: ${wsUrl}/ws`);

      this.socket = new WebSocket(`${wsUrl}/ws`);

      this.socket.onopen = () => {
        console.log("WebSocket connection established.");
        // Re-subscribe to any active subscriptions upon successful reconnection
        Object.keys(this.subscriptions).forEach(tankId => {
          if (this.subscriptions[tankId].active) {
            this.sendSubscriptionMessage(tankId);
          }
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          // If the message contains a tankId and there's an active subscription callback for it,
          // invoke the callback with the received data.
          if (data.tankId && this.subscriptions[data.tankId]?.callback) {
            this.subscriptions[data.tankId].callback(data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
        // Attempt to reconnect after a short delay (e.g., 3 seconds)
        // This creates a simple auto-reconnect mechanism.
        setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        // Close the socket to trigger the onclose event and subsequent reconnect attempt
        this.socket.close();
      };
    }
  }

  /**
   * Sends a subscription message to the WebSocket server for a specific tank.
   * @param {string} tankId The ID of the tank to subscribe to.
   */
  sendSubscriptionMessage(tankId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe', tankId }));
      console.log(`Sent subscribe message for tank: ${tankId}`);
    } else {
      console.warn(`WebSocket not open, cannot send subscribe message for tank: ${tankId}. Will retry on connect.`);
    }
  }

  /**
   * Subscribes a component to real-time data updates for a specific tank.
   * This method also sets up an interval for polling as a fallback/complement
   * if the WebSocket connection isn't the sole source of updates, or for initial data.
   * @param {string} tankId The ID of the tank to subscribe to.
   * @param {function} callback The function to call with new data.
   * @param {number} [interval=5000] The polling interval in milliseconds (if applicable).
   * @returns {function} An unsubscribe function to clean up the subscription.
   */
  subscribe(tankId, callback, interval = 5000) {
    // Clear any existing polling interval for this tank to prevent duplicates
    if (this.pollingIntervals[tankId]) {
      clearInterval(this.pollingIntervals[tankId]);
    }

    // Store the callback and mark as active
    this.subscriptions[tankId] = { callback, active: true };

    // Send a WebSocket subscription message
    this.sendSubscriptionMessage(tankId);

    // Set up a polling interval. In a purely WebSocket-driven system, this might be removed,
    // but it's kept here as per the original code's implied intent for periodic updates
    // or as a fallback.
    this.pollingIntervals[tankId] = setInterval(async () => {
      // Here, you might fetch the latest status via HTTP if WebSocket is not providing
      // continuous updates, or if this is meant as a robust fallback.
      // For this example, we assume WebSocket is the primary source,
      // and this interval is more for ensuring the connection is alive or for
      // fetching initial data if WebSocket wasn't ready.
      // If you need to fetch data via HTTP here, uncomment and implement:
      /*
      try {
        const response = await fetch(`${API_BASE_URL}/tanks/${tankId}/status`);
        if (response.ok) {
          const data = await response.json();
          if (this.subscriptions[tankId]?.callback) {
            this.subscriptions[tankId].callback(data);
          }
        } else {
          console.error(`Failed to poll status for tank ${tankId}:`, response.statusText);
        }
      } catch (error) {
        console.error(`Error during polling for tank ${tankId}:`, error);
      }
      */
    }, interval);

    // Return an unsubscribe function
    return () => {
      // Clear the polling interval
      if (this.pollingIntervals[tankId]) {
        clearInterval(this.pollingIntervals[tankId]);
        delete this.pollingIntervals[tankId];
      }
      // Send an unsubscribe message via WebSocket
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'unsubscribe', tankId }));
      }
      // Mark subscription as inactive and remove callback
      if (this.subscriptions[tankId]) {
        this.subscriptions[tankId].active = false;
        delete this.subscriptions[tankId];
      }
      console.log(`Unsubscribed from tank: ${tankId}`);
    };
  }
}

// Instantiate the service as a singleton and immediately attempt to connect.
// This ensures the WebSocket connection is managed globally across the app.
const realTimeDataService = new RealTimeDataService();
realTimeDataService.connect();

export default realTimeDataService;
