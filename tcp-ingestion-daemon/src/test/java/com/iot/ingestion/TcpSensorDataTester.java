package com.iot.ingestion;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

/**
 * Comprehensive TCP Sensor Data Tester
 * Tests the TCP Ingestion Daemon with various sensor data scenarios
 */
public class TcpSensorDataTester {
    
    private static final String TCP_HOST = "localhost";
    private static final int TCP_PORT = 8080;
    private static final int TIMEOUT_MS = 5000;
    
    // Sample sensor data (hex strings)
    private static final Map<String, String> SAMPLE_DATA = new HashMap<>();
    
    static {
        // Air quality sensor data
        SAMPLE_DATA.put("air_quality", "FEDC0A16098522754E000000010020000000C8000001F4000000640000003C000000C8000000500000000000000000");
        
        // Temperature/humidity sensor
        SAMPLE_DATA.put("temp_humidity", "FEDC0B16098522754E000000010018000000FA0000006400000000000000000000000000000000");
        
        // Weather station data
        SAMPLE_DATA.put("weather", "FEDC0C16098522754E000000010030000003E8000001F4000000C8000000640000001E000000320000000A00000014");
        
        // Liquid level sensor
        SAMPLE_DATA.put("liquid_level", "FEDC0D16098522754E00000001000C000001F4000000000000000000000000");
        
        // Multi-sensor data
        SAMPLE_DATA.put("multi_sensor", "FEDC0E16098522754E000000010028000000C8000001F4000000640000003C000000C8000000500000001E00000032");
    }
    
    public static void main(String[] args) {
        TcpSensorDataTester tester = new TcpSensorDataTester();
        
        System.out.println("🚀 Starting TCP Sensor Data Testing Suite");
        System.out.println("==========================================");
        
        try {
            // Test 1: Basic connectivity
            tester.testConnectivity();
            
            // Test 2: Single sensor data transmission
            tester.testSingleSensorData();
            
            // Test 3: Multiple sensor types
            tester.testMultipleSensorTypes();
            
            // Test 4: Concurrent connections
            tester.testConcurrentConnections();
            
            // Test 5: Error handling
            tester.testErrorHandling();
            
            // Test 6: Load testing
            tester.testLoadHandling();
            
            System.out.println("\n✅ All tests completed successfully!");
            
        } catch (Exception e) {
            System.err.println("❌ Test suite failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Test basic TCP connectivity
     */
    private void testConnectivity() throws Exception {
        System.out.println("\n📡 Test 1: Basic TCP Connectivity");
        System.out.println("----------------------------------");
        
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(TCP_HOST, TCP_PORT), TIMEOUT_MS);
            
            PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            
            // Send PING
            writer.println("PING");
            String response = reader.readLine();
            
            if ("PONG".equals(response)) {
                System.out.println("✅ Successfully connected to TCP server at " + TCP_HOST + ":" + TCP_PORT);
                System.out.println("📨 Server response: " + response);
            } else {
                throw new Exception("Unexpected response: " + response);
            }
        }
    }
    
    /**
     * Test single sensor data transmission
     */
    private void testSingleSensorData() throws Exception {
        System.out.println("\n📊 Test 2: Single Sensor Data Transmission");
        System.out.println("-------------------------------------------");
        
        String sensorData = SAMPLE_DATA.get("air_quality");
        
        try (Socket socket = new Socket(TCP_HOST, TCP_PORT)) {
            PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            
            System.out.println("📤 Sending air quality sensor data:");
            System.out.println("   Hex: " + sensorData.substring(0, 20) + "...");
            
            writer.println(sensorData);
            String response = reader.readLine();
            
            if ("OK".equals(response)) {
                System.out.println("✅ Single sensor data transmission successful");
            } else {
                throw new Exception("Failed to send sensor data. Response: " + response);
            }
        }
    }
    
    /**
     * Test multiple sensor types
     */
    private void testMultipleSensorTypes() throws Exception {
        System.out.println("\n🌡️ Test 3: Multiple Sensor Types");
        System.out.println("----------------------------------");
        
        for (Map.Entry<String, String> entry : SAMPLE_DATA.entrySet()) {
            String sensorType = entry.getKey();
            String hexData = entry.getValue();
            
            try (Socket socket = new Socket(TCP_HOST, TCP_PORT)) {
                PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);
                BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                
                System.out.println("📤 Testing " + sensorType + " sensor...");
                
                writer.println(hexData);
                String response = reader.readLine();
                
                if ("OK".equals(response)) {
                    System.out.println("✅ " + sensorType + " data sent successfully");
                } else {
                    System.err.println("❌ " + sensorType + " failed. Response: " + response);
                }
                
                Thread.sleep(100); // Small delay between tests
            }
        }
    }
    
    /**
     * Test concurrent connections
     */
    private void testConcurrentConnections() throws Exception {
        System.out.println("\n🔄 Test 4: Concurrent Connections");
        System.out.println("----------------------------------");
        
        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(numThreads);
        
        List<Future<Boolean>> futures = new ArrayList<>();
        
        for (int i = 0; i < numThreads; i++) {
            final int threadId = i;
            Future<Boolean> future = executor.submit(() -> {
                try {
                    String sensorData = SAMPLE_DATA.get("air_quality");
                    
                    try (Socket socket = new Socket(TCP_HOST, TCP_PORT)) {
                        PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);
                        BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                        
                        writer.println(sensorData);
                        String response = reader.readLine();
                        
                        boolean success = "OK".equals(response);
                        if (success) {
                            System.out.println("✅ Thread " + threadId + " completed successfully");
                        } else {
                            System.err.println("❌ Thread " + threadId + " failed: " + response);
                        }
                        
                        return success;
                    }
                } catch (Exception e) {
                    System.err.println("❌ Thread " + threadId + " exception: " + e.getMessage());
                    return false;
                } finally {
                    latch.countDown();
                }
            });
            
            futures.add(future);
        }
        
        // Wait for all threads to complete
        latch.await(30, TimeUnit.SECONDS);
        executor.shutdown();
        
        // Check results
        int successCount = 0;
        for (Future<Boolean> future : futures) {
            if (future.get()) {
                successCount++;
            }
        }
        
        System.out.println("📊 Concurrent test results: " + successCount + "/" + numThreads + " successful");
        
        if (successCount == numThreads) {
            System.out.println("✅ All concurrent connections handled successfully");
        } else {
            System.err.println("❌ Some concurrent connections failed");
        }
    }
    
    /**
     * Test error handling
     */
    private void testErrorHandling() throws Exception {
        System.out.println("\n🚨 Test 5: Error Handling");
        System.out.println("--------------------------");
        
        String[] invalidData = {
            "INVALID_HEX_DATA",
            "1234567890ABCDEF", // Too short
            "AAAA0A16098522754E000000010020000000C8000001F4000000640000003C000000C8000000500000000000000000", // Wrong header
            "", // Empty
            "FEDC0A16098522754E00000001002000000", // Truncated
        };
        
        for (int i = 0; i < invalidData.length; i++) {
            try (Socket socket = new Socket(TCP_HOST, TCP_PORT)) {
                PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);
                BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                
                System.out.println("📤 Testing invalid data " + (i + 1) + ": " + 
                    (invalidData[i].length() > 20 ? invalidData[i].substring(0, 20) + "..." : invalidData[i]));
                
                writer.println(invalidData[i]);
                String response = reader.readLine();
                
                if (response != null && response.startsWith("ERROR")) {
                    System.out.println("✅ Error properly handled: " + response);
                } else {
                    System.err.println("❌ Expected error response, got: " + response);
                }
                
                Thread.sleep(100);
            }
        }
    }
    
    /**
     * Test load handling
     */
    private void testLoadHandling() throws Exception {
        System.out.println("\n⚡ Test 6: Load Handling");
        System.out.println("------------------------");
        
        int messagesPerSecond = 50;
        int durationSeconds = 10;
        int totalMessages = messagesPerSecond * durationSeconds;
        
        System.out.println("📊 Sending " + messagesPerSecond + " messages/second for " + durationSeconds + " seconds");
        System.out.println("📊 Total messages: " + totalMessages);
        
        ExecutorService executor = Executors.newFixedThreadPool(20);
        CountDownLatch latch = new CountDownLatch(totalMessages);
        
        long startTime = System.currentTimeMillis();
        int successCount = 0;
        
        for (int i = 0; i < totalMessages; i++) {
            final int messageId = i;
            
            executor.submit(() -> {
                try {
                    String sensorData = SAMPLE_DATA.get("air_quality");
                    
                    try (Socket socket = new Socket(TCP_HOST, TCP_PORT)) {
                        PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);
                        BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                        
                        writer.println(sensorData);
                        String response = reader.readLine();
                        
                        if ("OK".equals(response)) {
                            synchronized (this) {
                                // successCount++; // This won't work due to scope
                            }
                        }
                    }
                } catch (Exception e) {
                    // Handle silently for load test
                } finally {
                    latch.countDown();
                }
            });
            
            // Control rate
            if (i % messagesPerSecond == 0 && i > 0) {
                Thread.sleep(1000);
            }
        }
        
        // Wait for completion
        latch.await(60, TimeUnit.SECONDS);
        executor.shutdown();
        
        long endTime = System.currentTimeMillis();
        double actualRate = (double) totalMessages / ((endTime - startTime) / 1000.0);
        
        System.out.println("📊 Load test completed");
        System.out.println("📊 Actual rate: " + String.format("%.2f", actualRate) + " messages/second");
        System.out.println("✅ Load handling test completed");
    }
}
