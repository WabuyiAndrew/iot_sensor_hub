import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.io.*;
import java.net.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Load Tester for TCP Ingestion System
 * Tests system performance under various load conditions
 */
public class LoadTester {
    
    private static final String TCP_HOST = "localhost";
    private static final int TCP_PORT = 8080;
    
    // Performance metrics
    private AtomicInteger totalMessages = new AtomicInteger(0);
    private AtomicInteger successfulMessages = new AtomicInteger(0);
    private AtomicInteger failedMessages = new AtomicInteger(0);
    private AtomicLong totalResponseTime = new AtomicLong(0);
    
    public static void main(String[] args) {
        LoadTester tester = new LoadTester();
        
        System.out.println("🚀 TCP Ingestion Load Testing Suite");
        System.out.println("====================================");
        
        try {
            // Test 1: Sustained load test
            tester.sustainedLoadTest(10, 100, 5000); // 10 threads, 100 msg/thread, 5ms interval
            
            // Test 2: Burst load test
            tester.burstLoadTest(50, 20); // 50 threads, 20 msg/thread, no delay
            
            // Test 3: Gradual ramp-up test
            tester.rampUpTest(1, 20, 10, 1000); // Start 1 thread, max 20, increment every 10 msg, 1s interval
            
            // Test 4: Endurance test
            tester.enduranceTest(5, 300); // 5 threads for 5 minutes
            
        } catch (Exception e) {
            System.err.println("❌ Load test failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Sustained load test - consistent load over time
     */
    public void sustainedLoadTest(int numThreads, int messagesPerThread, int intervalMs) throws Exception {
        System.out.println("\n📈 Sustained Load Test");
        System.out.println("----------------------");
        System.out.println("Threads: " + numThreads + ", Messages/Thread: " + messagesPerThread + 
                          ", Interval: " + intervalMs + "ms");
        
        resetMetrics();
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(numThreads);
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < numThreads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < messagesPerThread; j++) {
                        sendTestMessage(threadId, j);
                        if (intervalMs > 0) {
                            Thread.sleep(intervalMs);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Thread " + threadId + " error: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
        executor.shutdown();
        
        long endTime = System.currentTimeMillis();
        printResults("Sustained Load Test", startTime, endTime);
    }
    
    /**
     * Burst load test - maximum throughput test
     */
    public void burstLoadTest(int numThreads, int messagesPerThread) throws Exception {
        System.out.println("\n💥 Burst Load Test");
        System.out.println("------------------");
        System.out.println("Threads: " + numThreads + ", Messages/Thread: " + messagesPerThread + " (no delay)");
        
        resetMetrics();
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(numThreads);
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < numThreads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < messagesPerThread; j++) {
                        sendTestMessage(threadId, j);
                    }
                } catch (Exception e) {
                    System.err.println("Thread " + threadId + " error: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
        executor.shutdown();
        
        long endTime = System.currentTimeMillis();
        printResults("Burst Load Test", startTime, endTime);
    }
    
    /**
     * Gradual ramp-up test
     */
    public void rampUpTest(int startThreads, int maxThreads, int incrementInterval, int intervalMs) throws Exception {
        System.out.println("\n📊 Ramp-up Load Test");
        System.out.println("--------------------");
        System.out.println("Start: " + startThreads + " threads, Max: " + maxThreads + 
                          " threads, Increment every: " + incrementInterval + " messages");
        
        resetMetrics();
        long startTime = System.currentTimeMillis();
        
        for (int currentThreads = startThreads; currentThreads <= maxThreads; currentThreads++) {
            System.out.println("🔄 Ramping up to " + currentThreads + " threads...");
            
            ExecutorService executor = Executors.newFixedThreadPool(currentThreads);
            CountDownLatch latch = new CountDownLatch(currentThreads);
            
            for (int i = 0; i < currentThreads; i++) {
                final int threadId = i;
                executor.submit(() -> {
                    try {
                        for (int j = 0; j < incrementInterval; j++) {
                            sendTestMessage(threadId, j);
                            if (intervalMs > 0) {
                                Thread.sleep(intervalMs);
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("Thread " + threadId + " error: " + e.getMessage());
                    } finally {
                        latch.countDown();
                    }
                });
            }
            
            latch.await();
            executor.shutdown();
            
            // Brief pause between ramp-up stages
            Thread.sleep(2000);
        }
        
        long endTime = System.currentTimeMillis();
        printResults("Ramp-up Load Test", startTime, endTime);
    }
    
    /**
     * Endurance test - long duration test
     */
    public void enduranceTest(int numThreads, int durationSeconds) throws Exception {
        System.out.println("\n⏰ Endurance Test");
        System.out.println("-----------------");
        System.out.println("Threads: " + numThreads + ", Duration: " + durationSeconds + " seconds");
        
        resetMetrics();
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        
        long startTime = System.currentTimeMillis();
        long endTime = startTime + (durationSeconds * 1000L);
        
        AtomicInteger activeThreads = new AtomicInteger(numThreads);
        
        for (int i = 0; i < numThreads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    int messageCount = 0;
                    while (System.currentTimeMillis() < endTime) {
                        sendTestMessage(threadId, messageCount++);
                        Thread.sleep(1000); // 1 message per second per thread
                        
                        // Print progress every 30 seconds
                        if (messageCount % 30 == 0) {
                            long elapsed = (System.currentTimeMillis() - startTime) / 1000;
                            System.out.println("   Thread " + threadId + ": " + messageCount + 
                                             " messages (" + elapsed + "s elapsed)");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Thread " + threadId + " error: " + e.getMessage());
                } finally {
                    activeThreads.decrementAndGet();
                }
            });
        }
        
        // Wait for all threads to complete
        while (activeThreads.get() > 0) {
            Thread.sleep(1000);
        }
        
        executor.shutdown();
        
        long actualEndTime = System.currentTimeMillis();
        printResults("Endurance Test", startTime, actualEndTime);
    }
    
    /**
     * Send a test message and record metrics
     */
    private void sendTestMessage(int threadId, int messageId) {
        long messageStart = System.currentTimeMillis();
        totalMessages.incrementAndGet();
        
        try {
            // Generate test sensor data
            String hexData = generateTestHexData();
            
            // Send via TCP
            boolean success = sendTcpMessage(hexData);
            
            long responseTime = System.currentTimeMillis() - messageStart;
            totalResponseTime.addAndGet(responseTime);
            
            if (success) {
                successfulMessages.incrementAndGet();
            } else {
                failedMessages.incrementAndGet();
            }
            
        } catch (Exception e) {
            failedMessages.incrementAndGet();
            System.err.println("Message send error (Thread " + threadId + ", Msg " + messageId + "): " + e.getMessage());
        }
    }
    
    /**
     * Send TCP message
     */
    private boolean sendTcpMessage(String hexData) {
        try (Socket socket = new Socket(TCP_HOST, TCP_PORT)) {
            socket.setSoTimeout(5000); // 5 second timeout
            
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            
            // Send timestamp + hex data
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            String logLine = timestamp + " " + hexData;
            
            out.println(logLine);
            
            // Wait for response (optional)
            String response = in.readLine();
            return response != null && !response.toLowerCase().contains("error");
            
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Generate test hex data
     */
    private String generateTestHexData() {
        Random random = new Random();
        
        // Simple air quality sensor data
        StringBuilder hex = new StringBuilder();
        hex.append("FEDC");                                    // Header
        hex.append("0A");                                      // Version
        hex.append("16098522754E");                           // Sensor ID
        hex.append(String.format("%08X", random.nextInt()));  // Session ID
        hex.append("01");                                      // Order
        hex.append("0020");                                    // Length (32 bytes)
        
        // Sensor values (8 values * 4 bytes each = 32 bytes)
        hex.append(String.format("%08X", (int)(random.nextDouble() * 400 + 200))); // Temperature * 10
        hex.append(String.format("%08X", (int)(random.nextDouble() * 600 + 300))); // Humidity * 10
        hex.append(String.format("%08X", (int)(random.nextDouble() * 100)));       // PM2.5
        hex.append(String.format("%08X", (int)(random.nextDouble() * 150)));       // PM10
        hex.append(String.format("%08X", (int)(random.nextDouble() * 700 + 300))); // Noise * 10
        hex.append(String.format("%08X", (int)(random.nextDouble() * 2000)));      // Liquid level
        hex.append(String.format("%08X", 75));                                     // RSSI
        hex.append(String.format("%08X", 0));                                      // Error code
        
        return hex.toString();
    }
    
    /**
     * Reset performance metrics
     */
    private void resetMetrics() {
        totalMessages.set(0);
        successfulMessages.set(0);
        failedMessages.set(0);
        totalResponseTime.set(0);
    }
    
    /**
     * Print test results
     */
    private void printResults(String testName, long startTime, long endTime) {
        double durationSeconds = (endTime - startTime) / 1000.0;
        int total = totalMessages.get();
        int successful = successfulMessages.get();
        int failed = failedMessages.get();
        
        System.out.println("\n✅ " + testName + " Results:");
        System.out.println("   Duration: " + String.format("%.2f", durationSeconds) + " seconds");
        System.out.println("   Total Messages: " + total);
        System.out.println("   Successful: " + successful + " (" + String.format("%.1f", (successful * 100.0 / total)) + "%)");
        System.out.println("   Failed: " + failed + " (" + String.format("%.1f", (failed * 100.0 / total)) + "%)");
        System.out.println("   Throughput: " + String.format("%.1f", successful / durationSeconds) + " messages/sec");
        
        if (successful > 0) {
            double avgResponseTime = totalResponseTime.get() / (double) successful;
            System.out.println("   Avg Response Time: " + String.format("%.2f", avgResponseTime) + " ms");
        }
        
        System.out.println("   " + "=".repeat(50));
    }
}
