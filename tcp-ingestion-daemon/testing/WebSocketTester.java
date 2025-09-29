import java.net.URI;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.websocket.*;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

/**
 * WebSocket Tester for Real-time Data Verification
 * Tests the WebSocket connection and real-time data broadcasting
 */
public class WebSocketTester {
    
    private static final String WEBSOCKET_URL = "ws://localhost:5000";
    private static final String AUTH_TOKEN = "your_jwt_token_here"; // Replace with actual token
    
    private WebSocketClient client;
    private CountDownLatch connectionLatch;
    private CountDownLatch messageLatch;
    private Gson gson = new Gson();
    
    public static void main(String[] args) {
        WebSocketTester tester = new WebSocketTester();
        
        try {
            System.out.println("🔌 Testing WebSocket Real-time Data Broadcasting");
            System.out.println("================================================");
            
            tester.testWebSocketConnection();
            tester.testRealTimeDataReception();
            
        } catch (Exception e) {
            System.err.println("❌ WebSocket test failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public void testWebSocketConnection() throws Exception {
        System.out.println("\n📡 Test: WebSocket Connection");
        System.out.println("------------------------------");
        
        connectionLatch = new CountDownLatch(1);
        
        client = new WebSocketClient(new URI(WEBSOCKET_URL)) {
            @Override
            public void onOpen(ServerHandshake handshake) {
                System.out.println("✅ WebSocket connection opened");
                
                // Send authentication
                JsonObject authMessage = new JsonObject();
                authMessage.addProperty("type", "auth");
                authMessage.addProperty("token", AUTH_TOKEN);
                
                send(authMessage.toString());
                connectionLatch.countDown();
            }
            
            @Override
            public void onMessage(String message) {
                try {
                    JsonObject data = gson.fromJson(message, JsonObject.class);
                    String type = data.get("type").getAsString();
                    
                    switch (type) {
                        case "welcome":
                            System.out.println("👋 Welcome message received");
                            break;
                        case "auth-success":
                            System.out.println("🔐 Authentication successful");
                            break;
                        case "auth-error":
                            System.err.println("❌ Authentication failed");
                            break;
                        case "sensor-data":
                            System.out.println("📊 Real-time sensor data received:");
                            System.out.println("   Device: " + data.getAsJsonObject("data").get("deviceId"));
                            System.out.println("   Type: " + data.getAsJsonObject("data").get("sensorType"));
                            break;
                        case "device-status":
                            System.out.println("📱 Device status update received");
                            break;
                        default:
                            System.out.println("📨 Message received: " + type);
                    }
                } catch (Exception e) {
                    System.err.println("❌ Error parsing message: " + e.getMessage());
                }
            }
            
            @Override
            public void onClose(int code, String reason, boolean remote) {
                System.out.println("🔌 WebSocket connection closed: " + reason);
            }
            
            @Override
            public void onError(Exception ex) {
                System.err.println("❌ WebSocket error: " + ex.getMessage());
            }
        };
        
        client.connect();
        
        // Wait for connection
        if (connectionLatch.await(10, TimeUnit.SECONDS)) {
            System.out.println("✅ WebSocket connection test passed");
        } else {
            throw new Exception("WebSocket connection timeout");
        }
    }
    
    public void testRealTimeDataReception() throws Exception {
        System.out.println("\n📊 Test: Real-time Data Reception");
        System.out.println("----------------------------------");
        
        messageLatch = new CountDownLatch(5); // Wait for 5 messages
        
        // Subscribe to specific device data
        JsonObject subscribeMessage = new JsonObject();
        subscribeMessage.addProperty("type", "subscribe");
        subscribeMessage.add("deviceIds", gson.toJsonTree(new String[]{"16098522754E", "124A7DA90849"}));
        
        client.send(subscribeMessage.toString());
        
        System.out.println("📡 Waiting for real-time sensor data...");
        System.out.println("   (Send some TCP data using TcpSensorDataTester to see real-time updates)");
        
        // Wait for messages or timeout
        if (messageLatch.await(60, TimeUnit.SECONDS)) {
            System.out.println("✅ Real-time data reception test passed");
        } else {
            System.out.println("⚠️ No real-time data received within timeout period");
        }
        
        client.close();
    }
}
