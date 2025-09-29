// C:\Users\Andy\Documents\GitHub\iot\server\services\RealTimeService.js

const WebSocket = require("ws");
const jwt = require('jsonwebtoken'); // For authenticating WebSocket connections
const ErrorResponse = require("../utils/errorResponse"); // Ensure this path is correct

let wss; // WebSocket Server instance
const connectedClients = new Map(); // Map to store connected clients by user ID

/**
 * Extracts JWT token from WebSocket upgrade request.
 * This example assumes the token is in a query parameter or a cookie.
 * @param {object} req - The HTTP request object from the WebSocket handshake.
 * @returns {string|null} The extracted JWT token or null if not found.
 */
const extractTokenFromRequest = (req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const tokenFromQuery = urlParams.get('token');
  if (tokenFromQuery) {
    return tokenFromQuery;
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim()).reduce((acc, curr) => {
          const [key, value] = curr.trim().split('=');
          acc[key] = value;
      }, {});
      if (cookies.jwt) { // Assuming your JWT cookie is named 'jwt'
          return cookies.jwt;
      }
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
  }

  return null;
};

/**
 * Sends a message to all currently connected and authenticated WebSocket clients.
 * This is the core broadcasting mechanism for the 'ws' library.
 * @param {string} type - The type of event (e.g., 'tankStatusUpdate', 'alert').
 * @param {object} payload - The data associated with the event.
 */
const broadcastMessage = (type, payload) => {
  if (wss && wss.clients) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.isAuthenticated) {
        client.send(JSON.stringify({ type, payload }));
      }
    });
    console.log(`Broadcasted message of type '${type}':`, payload);
  } else {
    console.warn("WebSocket Server (wss) not initialized or no clients to broadcast to.");
  }
};


class RealTimeService {
  /**
   * Emits a tank status update to all connected WebSocket clients.
   * This method is called from your tankTypeController.js.
   * @param {string} tankId - The ID of the tank being updated.
   * @param {object} data - The updated tank status data.
   */
  static emitTankStatusUpdate(tankId, data) {
    broadcastMessage(`tankStatus:${tankId}`, data);
    broadcastMessage("globalTankStatusUpdate", { tankId, ...data });
    console.log(`Emitted tankStatusUpdate for ${tankId}:`, data);
  }

  // You can add other static methods here if needed, e.g., for alerts or device status
  // static emitAlert(tankId, alerts) {
  //   broadcastMessage(`tankAlert:${tankId}`, alerts);
  //   broadcastMessage("globalAlert", { tankId, alerts });
  //   console.log(`Emitted alert for ${tankId}:`, alerts);
  // }
}

/**
 * Initializes the WebSocket server and sets up connection handling.
 * This function should be called once when your main HTTP server starts.
 * @param {object} server - The HTTP server instance to attach the WebSocket server to.
 */
exports.initWebSocket = (server) => {
  if (wss) {
    console.log('WebSocket Server already initialized.');
    return wss;
  }

  wss = new WebSocket.Server({ server });

  wss.on("connection", async (ws, req) => {
    console.log("New WebSocket connection attempt.");

    // --- Authentication Logic ---
    const token = extractTokenFromRequest(req);
    if (!token) {
      ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'No authentication token provided.' }));
      ws.close(1008, 'Authentication required');
      console.log('Unauthenticated WebSocket connection closed: No token.');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.TOKEN_KEY);
      const userId = decoded.userId;

      ws.userId = userId;
      ws.isAuthenticated = true;
      connectedClients.set(userId, ws);

      ws.isAlive = true;
      console.log(`WebSocket client authenticated: User ID ${userId}`);
      ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', message: 'Authenticated successfully.' }));

    } catch (error) {
      console.error('WebSocket authentication failed:', error.message);
      ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Authentication failed: Invalid token.' }));
      ws.close(1008, 'Authentication failed');
      return;
    }
    // --- End Authentication Logic ---

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (message) => {
      console.log(`Received message from client ${ws.userId || 'unauthenticated'}: ${message}`);
      if (!ws.isAuthenticated) {
        ws.send(JSON.stringify({ success: false, message: "Authentication required to send messages." }));
        return;
      }

      // If you intend for clients to send messages for other purposes, handle them here.
      // Based on your current setup, sensor readings are handled via HTTP POST to the controller.
      try {
        const data = JSON.parse(message);
        ws.send(JSON.stringify({ success: false, message: `Unknown message type: ${data.type || 'N/A'}. Only server-to-client updates are primarily handled.` }));
      } catch (error) {
        console.error("WebSocket message parsing error:", error);
        ws.send(JSON.stringify({ success: false, message: error.message || "Server error processing message." }));
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`Client ${ws.userId || 'unauthenticated'} disconnected from WebSocket. Code: ${code}, Reason: ${reason}`);
      if (ws.userId) {
        connectedClients.delete(ws.userId);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Set up ping interval to detect dead connections
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (!client.isAlive) {
        console.log(`Terminating dead WebSocket connection for user: ${client.userId || 'unknown'}`);
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000); // Ping every 30 seconds (30000ms)

  console.log("WebSocket server initialized");
  return wss;
};

// Export the class itself as the main module export for other parts of the backend to use its static methods
module.exports = RealTimeService;