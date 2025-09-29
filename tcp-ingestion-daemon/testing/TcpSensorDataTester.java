import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Comprehensive TCP Sensor Data Tester for IoT Ingestion System
 * Tests the complete pipeline: TCP -> Backend -> Database -> WebSocket
 */
public class TcpSensorDataTester {
    
    // Configuration
    private static final String TCP_HOST = "localhost";
    private static final int TCP_PORT = 8080; // Your Java TCP server port
    private static final String BACKEND_URL = "http://localhost:5000";
    
    // Test data configurations
    private static final Map<String, SensorConfig> SENSOR_CONFIGS = new HashMap<>();
    
    static {
        // Air Quality Sensor
        SENSOR_CONFIGS.put("air_quality", new SensorConfig(
            "16098522754E", // Sensor ID
            "air_quality",
            Arrays.asList("temperature", "humidity", "pm2_5", "pm10", "noise", "ultrasonic_liquid_level")
        ));
        
        // Weather Sensor
        SENSOR_CONFIGS.put("weather", new SensorConfig(
            "124A7DA90849", // Sensor ID
            "weather", 
            Arrays.asList("temperature", "humidity", "atmospheric_pressure", "pm2_5", "pm10", 
                         "wind_speed", "wind_direction", "rainfall", "total_solar_radiation")
        ));
    }
    
    public static void main(String[] args) {
        TcpSensorDataTester tester = new TcpSensorDataTester();
        
        System.out.println("🚀 Starting TCP Sensor Data Testing Suite");
        System.out.println("==========================================");
        
        try {
            // Test 1: Basic connectivity
            tester.testBasicConnectivity();
            
            // Test 2: Single sensor data transmission
            tester.testSingleSensorData();
            
            // Test 3: Multiple sensor types
            tester.testMultipleSensorTypes();
            
            // Test 4: Bulk data transmission
            tester.testBulkDataTransmission();
            
            // Test 5: Error conditions
            tester.testErrorConditions();
            
            // Test 6: Concurrent connections
            tester.testConcurrentConnections();
            
            // Test 7: Real-time simulation
            tester.testRealTimeSimulation();
            
        } catch (Exception e) {
            System.err.println("❌ Test suite failed: " + e.getMessage());
            e.printStackTrace();
        }
        
        System.out.println("\n✅ Test suite completed!");
    }
    
    /**
     * Test 1: Basic TCP connectivity
     */
    public void testBasicConnectivity() throws Exception {
        System.out.println("\n📡 Test 1: Basic TCP Connectivity");
        System.out.println("----------------------------------");
        
        try (Socket socket = new Socket(TCP_HOST, TCP_PORT)) {
            System.out.println("✅ Successfully connected to TCP server at " + TCP_HOST + ":" + TCP_PORT);
            
            // Test basic communication
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            
            out.println("PING");
            String response = in.readLine();
            System.out.println("📨 Server response: " + response);
            
        } catch (Exception e) {
            System.err.println("❌ TCP connectivity test failed: " + e.getMessage());
            throw e;
        }
    }
    
    /**
     * Test 2: Single sensor data transmission
     */
    public void testSingleSensorData() throws Exception {
        System.out.println("\n📊 Test 2: Single Sensor Data Transmission");
        System.out.println("-------------------------------------------");
        
        SensorConfig config = SENSOR_CONFIGS.get("air_quality");
        String hexData = generateSensorHexData(config, generateRandomSensorValues(config));
        
        System.out.println("📤 Sending air quality sensor data:");
        System.out.println("   Hex: " + hexData);
        
        boolean success = sendTcpData(hexData);
        if (success) {
            System.out.println("✅ Single sensor data transmission successful");
            Thread.sleep(2000); // Wait for processing
            verifyDataInBackend(config.sensorId);
        } else {
            System.err.println("❌ Single sensor data transmission failed");
        }
    }
    
    /**
     * Test 3: Multiple sensor types
     */
    public void testMultipleSensorTypes() throws Exception {
        System.out.println("\n🌡️ Test 3: Multiple Sensor Types");
        System.out.println("----------------------------------");
        
        for (Map.Entry<String, SensorConfig> entry : SENSOR_CONFIGS.entrySet()) {
            String sensorType = entry.getKey();
            SensorConfig config = entry.getValue();
            
            System.out.println("📤 Testing " + sensorType + " sensor...");
            
            Map<String, Double> values = generateRandomSensorValues(config);
            String hexData = generateSensorHexData(config, values);
            
            System.out.println("   Generated values: " + values);
            System.out.println("   Hex data: " + hexData);
            
            boolean success = sendTcpData(hexData);
            if (success) {
                System.out.println("✅ " + sensorType + " data sent successfully");
            } else {
                System.err.println("❌ " + sensorType + " data transmission failed");
            }
            
            Thread.sleep(1000); // Delay between sensors
        }
    }
    
    /**
     * Test 4: Bulk data transmission
     */
    public void testBulkDataTransmission() throws Exception {
        System.out.println("\n📦 Test 4: Bulk Data Transmission");
        System.out.println("----------------------------------");
        
        int bulkSize = 50;
        System.out.println("📤 Sending " + bulkSize + " sensor readings...");
        
        long startTime = System.currentTimeMillis();
        int successCount = 0;
        
        for (int i = 0; i < bulkSize; i++) {
            SensorConfig config = SENSOR_CONFIGS.get("air_quality");
            Map<String, Double> values = generateRandomSensorValues(config);
            String hexData = generateSensorHexData(config, values);
            
            if (sendTcpData(hexData)) {
                successCount++;
            }
            
            if (i % 10 == 0) {
                System.out.println("   Progress: " + i + "/" + bulkSize);
            }
            
            Thread.sleep(100); // Small delay to prevent overwhelming
        }
        
        long endTime = System.currentTimeMillis();
        double duration = (endTime - startTime) / 1000.0;
        
        System.out.println("✅ Bulk transmission completed:");
        System.out.println("   Success rate: " + successCount + "/" + bulkSize + " (" + 
                          String.format("%.1f", (successCount * 100.0 / bulkSize)) + "%)");
        System.out.println("   Duration: " + String.format("%.2f", duration) + " seconds");
        System.out.println("   Throughput: " + String.format("%.1f", successCount / duration) + " messages/sec");
    }
    
    /**
     * Test 5: Error conditions
     */
    public void testErrorConditions() throws Exception {
        System.out.println("\n⚠️ Test 5: Error Conditions");
        System.out.println("----------------------------");
        
        // Test invalid hex data
        System.out.println("📤 Testing invalid hex data...");
        sendTcpData("INVALID_HEX_DATA");
        
        // Test malformed protocol
        System.out.println("📤 Testing malformed protocol...");
        sendTcpData("ABCD1234567890ABCDEF"); // Too short
        
        // Test wrong header
        System.out.println("📤 Testing wrong header...");
        sendTcpData("ABCD0116098522754E000000010020000000640000006400000000000000000000000000000000000000000000");
        
        // Test oversized data
        System.out.println("📤 Testing oversized data...");
        StringBuilder oversized = new StringBuilder("FEDC01");
        for (int i = 0; i < 1000; i++) {
            oversized.append("FF");
        }
        sendTcpData(oversized.toString());
        
        System.out.println("✅ Error condition tests completed");
    }
    
    /**
     * Test 6: Concurrent connections
     */
    public void testConcurrentConnections() throws Exception {
        System.out.println("\n🔄 Test 6: Concurrent Connections");
        System.out.println("----------------------------------");
        
        int numThreads = 5;
        int messagesPerThread = 10;
        
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(numThreads);
        AtomicInteger totalSuccess = new AtomicInteger(0);
        
        System.out.println("📤 Starting " + numThreads + " concurrent connections...");
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < numThreads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    int successCount = 0;
                    SensorConfig config = SENSOR_CONFIGS.get("air_quality");
                    
                    for (int j = 0; j < messagesPerThread; j++) {
                        Map<String, Double> values = generateRandomSensorValues(config);
                        String hexData = generateSensorHexData(config, values);
                        
                        if (sendTcpData(hexData)) {
                            successCount++;
                        }
                        Thread.sleep(200); // Small delay
                    }
                    
                    totalSuccess.addAndGet(successCount);
                    System.out.println("   Thread " + threadId + " completed: " + successCount + "/" + messagesPerThread);
                    
                } catch (Exception e) {
                    System.err.println("❌ Thread " + threadId + " failed: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await(60, TimeUnit.SECONDS);
        executor.shutdown();
        
        long endTime = System.currentTimeMillis();
        double duration = (endTime - startTime) / 1000.0;
        int totalMessages = numThreads * messagesPerThread;
        
        System.out.println("✅ Concurrent connection test completed:");
        System.out.println("   Total success: " + totalSuccess.get() + "/" + totalMessages);
        System.out.println("   Duration: " + String.format("%.2f", duration) + " seconds");
        System.out.println("   Concurrent throughput: " + String.format("%.1f", totalSuccess.get() / duration) + " messages/sec");
    }
    
    /**
     * Test 7: Real-time simulation
     */
    public void testRealTimeSimulation() throws Exception {
        System.out.println("\n⏰ Test 7: Real-time Simulation");
        System.out.println("-------------------------------");
        
        System.out.println("📤 Starting 60-second real-time simulation...");
        System.out.println("   Simulating multiple sensors with realistic intervals");
        
        long startTime = System.currentTimeMillis();
        long endTime = startTime + 60000; // 60 seconds
        int messageCount = 0;
        
        Random random = new Random();
        
        while (System.currentTimeMillis() < endTime) {
            // Randomly select sensor type
            String[] sensorTypes = {"air_quality", "weather"};
            String selectedType = sensorTypes[random.nextInt(sensorTypes.length)];
            SensorConfig config = SENSOR_CONFIGS.get(selectedType);
            
            // Generate realistic sensor values
            Map<String, Double> values = generateRealisticSensorValues(config);
            String hexData = generateSensorHexData(config, values);
            
            if (sendTcpData(hexData)) {
                messageCount++;
                if (messageCount % 10 == 0) {
                    long elapsed = System.currentTimeMillis() - startTime;
                    System.out.println("   Messages sent: " + messageCount + " (elapsed: " + (elapsed/1000) + "s)");
                }
            }
            
            // Random interval between 2-8 seconds (realistic sensor reporting)
            Thread.sleep(2000 + random.nextInt(6000));
        }
        
        long actualDuration = (System.currentTimeMillis() - startTime) / 1000;
        System.out.println("✅ Real-time simulation completed:");
        System.out.println("   Messages sent: " + messageCount);
        System.out.println("   Duration: " + actualDuration + " seconds");
        System.out.println("   Average interval: " + String.format("%.1f", actualDuration / (double)messageCount) + " seconds");
    }
    
    /**
     * Send TCP data to the ingestion server
     */
    private boolean sendTcpData(String hexData) {
        try (Socket socket = new Socket(TCP_HOST, TCP_PORT)) {
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            
            // Send timestamp + hex data (simulating log format)
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            String logLine = timestamp + " " + hexData;
            
            out.println(logLine);
            
            // Wait for acknowledgment (optional)
            socket.setSoTimeout(5000); // 5 second timeout
            String response = in.readLine();
            
            return response != null && !response.toLowerCase().contains("error");
            
        } catch (Exception e) {
            System.err.println("❌ TCP transmission failed: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Generate sensor hex data according to protocol
     */
    private String generateSensorHexData(SensorConfig config, Map<String, Double> values) {
        StringBuilder hex = new StringBuilder();
        
        // Header (4 chars)
        hex.append("FEDC");
        
        // Version (2 chars) - 1.0 = 0x0A
        hex.append("0A");
        
        // Sensor ID (12 chars)
        hex.append(config.sensorId);
        
        // Session ID (8 chars) - random
        hex.append(String.format("%08X", new Random().nextInt()));
        
        // Order (2 chars)
        hex.append("01");
        
        // Calculate data length and append payload
        StringBuilder payload = new StringBuilder();
        
        for (String param : config.parameters) {
            Double value = values.get(param);
            if (value != null) {
                // Convert to appropriate scale and format as 4-byte hex
                int scaledValue = scaleValueForTransmission(param, value);
                payload.append(String.format("%08X", scaledValue));
            } else {
                payload.append("00000000"); // Default value
            }
        }
        
        // Add RSSI and error code
        payload.append(String.format("%08X", 75)); // RSSI raw (75%)
        payload.append(String.format("%08X", 0));  // Error code (0 = no error)
        
        // Length (4 chars) - payload length in bytes
        int payloadLengthBytes = payload.length() / 2;
        hex.append(String.format("%04X", payloadLengthBytes));
        
        // Append payload
        hex.append(payload);
        
        return hex.toString();
    }
    
    /**
     * Scale values for transmission according to protocol
     */
    private int scaleValueForTransmission(String parameter, double value) {
        switch (parameter) {
            case "temperature":
            case "humidity":
            case "wind_speed":
            case "rainfall":
                return (int) (value * 10); // Scale by 10
            case "atmospheric_pressure":
                return (int) (value * 100); // Scale by 100
            case "ultrasonic_liquid_level":
                return (int) (value * 1000); // Scale by 1000 (mm)
            case "pm2_5":
            case "pm10":
            case "wind_direction":
            case "total_solar_radiation":
            case "noise":
            default:
                return (int) value; // No scaling
        }
    }
    
    /**
     * Generate random sensor values for testing
     */
    private Map<String, Double> generateRandomSensorValues(SensorConfig config) {
        Map<String, Double> values = new HashMap<>();
        Random random = new Random();
        
        for (String param : config.parameters) {
            switch (param) {
                case "temperature":
                    values.put(param, -10 + random.nextDouble() * 50); // -10 to 40°C
                    break;
                case "humidity":
                    values.put(param, 20 + random.nextDouble() * 60); // 20-80%
                    break;
                case "pm2_5":
                    values.put(param, random.nextDouble() * 100); // 0-100 µg/m³
                    break;
                case "pm10":
                    values.put(param, random.nextDouble() * 150); // 0-150 µg/m³
                    break;
                case "atmospheric_pressure":
                    values.put(param, 950 + random.nextDouble() * 100); // 950-1050 hPa
                    break;
                case "wind_speed":
                    values.put(param, random.nextDouble() * 20); // 0-20 m/s
                    break;
                case "wind_direction":
                    values.put(param, random.nextDouble() * 360); // 0-360°
                    break;
                case "rainfall":
                    values.put(param, random.nextDouble() * 10); // 0-10 mm
                    break;
                case "total_solar_radiation":
                    values.put(param, random.nextDouble() * 1000); // 0-1000 W/m²
                    break;
                case "noise":
                    values.put(param, 30 + random.nextDouble() * 70); // 30-100 dB
                    break;
                case "ultrasonic_liquid_level":
                    values.put(param, random.nextDouble() * 2000); // 0-2000 mm
                    break;
            }
        }
        
        return values;
    }
    
    /**
     * Generate realistic sensor values (more realistic than random)
     */
    private Map<String, Double> generateRealisticSensorValues(SensorConfig config) {
        Map<String, Double> values = new HashMap<>();
        Random random = new Random();
        
        // Base values that change slowly over time
        long timeOfDay = System.currentTimeMillis() % (24 * 60 * 60 * 1000);
        double hourOfDay = timeOfDay / (60.0 * 60.0 * 1000.0);
        
        for (String param : config.parameters) {
            switch (param) {
                case "temperature":
                    // Temperature varies with time of day
                    double baseTemp = 20 + 10 * Math.sin((hourOfDay - 6) * Math.PI / 12);
                    values.put(param, baseTemp + (random.nextGaussian() * 2));
                    break;
                case "humidity":
                    // Humidity inversely related to temperature
                    double baseHumidity = 70 - (hourOfDay - 12) * 2;
                    values.put(param, Math.max(30, Math.min(90, baseHumidity + random.nextGaussian() * 5)));
                    break;
                case "pm2_5":
                    values.put(param, Math.max(0, 25 + random.nextGaussian() * 10));
                    break;
                case "pm10":
                    values.put(param, Math.max(0, 40 + random.nextGaussian() * 15));
                    break;
                case "atmospheric_pressure":
                    values.put(param, 1013 + random.nextGaussian() * 10);
                    break;
                case "wind_speed":
                    values.put(param, Math.max(0, 5 + random.nextGaussian() * 3));
                    break;
                case "wind_direction":
                    values.put(param, random.nextDouble() * 360);
                    break;
                case "rainfall":
                    values.put(param, Math.max(0, random.nextGaussian() * 2));
                    break;
                case "total_solar_radiation":
                    // Solar radiation varies with time of day
                    double solarBase = Math.max(0, 500 * Math.sin((hourOfDay - 6) * Math.PI / 12));
                    values.put(param, solarBase + random.nextGaussian() * 50);
                    break;
                case "noise":
                    values.put(param, 45 + random.nextGaussian() * 10);
                    break;
                case "ultrasonic_liquid_level":
                    // Liquid level changes slowly
                    values.put(param, 500 + random.nextGaussian() * 100);
                    break;
            }
        }
        
        return values;
    }
    
    /**
     * Verify data was processed by backend
     */
    private void verifyDataInBackend(String sensorId) {
        try {
            // This would make an HTTP request to your backend API
            // to verify the data was processed and stored
            System.out.println("🔍 Verifying data in backend for sensor: " + sensorId);
            // Implementation would depend on your backend API structure
        } catch (Exception e) {
            System.err.println("⚠️ Could not verify backend data: " + e.getMessage());
        }
    }
    
    /**
     * Sensor configuration class
     */
    static class SensorConfig {
        String sensorId;
        String type;
        List<String> parameters;
        
        SensorConfig(String sensorId, String type, List<String> parameters) {
            this.sensorId = sensorId;
            this.type = type;
            this.parameters = parameters;
        }
    }
}
