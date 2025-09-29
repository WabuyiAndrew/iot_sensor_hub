package com.iot;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Enhanced HTTP Backend Forwarder with proper POST request handling
 */
public class HttpBackendForwarder {
    private static final String DEFAULT_BACKEND_URL = "http://localhost:5000/api/sensor/raw-data";
    private static final int CONNECT_TIMEOUT = 10000; // 10 seconds
    private static final int READ_TIMEOUT = 15000; // 15 seconds
    private static final int MAX_RETRIES = 3;
    
    private final String backendUrl;
    private final ObjectMapper objectMapper;
    private final ExecutorService executorService;
    
    // Statistics
    private volatile long totalRequests = 0;
    private volatile long successfulRequests = 0;
    private volatile long failedRequests = 0;
    
    public HttpBackendForwarder() {
        this(DEFAULT_BACKEND_URL);
    }
    
    public HttpBackendForwarder(String backendUrl) {
        this.backendUrl = backendUrl != null ? backendUrl : DEFAULT_BACKEND_URL;
        this.objectMapper = new ObjectMapper();
        this.executorService = Executors.newFixedThreadPool(10);
        
        System.out.println("🔗 HTTP Backend Forwarder initialized");
        System.out.println("📡 Backend URL: " + this.backendUrl);
    }
    
    /**
     * Forward sensor data to backend asynchronously
     */
    public CompletableFuture<Boolean> forwardSensorDataAsync(String hexData, String clientInfo) {
        return CompletableFuture.supplyAsync(() -> {
            return forwardSensorData(hexData, clientInfo);
        }, executorService);
    }
    
    /**
     * Forward sensor data to backend synchronously with retry logic
     */
    public boolean forwardSensorData(String hexData, String clientInfo) {
        if (hexData == null || hexData.trim().isEmpty()) {
            System.err.println("❌ Cannot forward empty hex data");
            return false;
        }
        
        totalRequests++;
        
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                boolean success = attemptForward(hexData, clientInfo, attempt);
                if (success) {
                    successfulRequests++;
                    return true;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < MAX_RETRIES) {
                    System.out.println("🔄 Retrying in " + (1000 * attempt) + "ms...");
                    Thread.sleep(1000 * attempt);
                }
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                System.err.println("❌ Forwarding interrupted for: " + hexData.substring(0, Math.min(50, hexData.length())) + "...");
                break;
            } catch (Exception e) {
                System.err.println("❌ Attempt " + attempt + " failed for " + hexData.substring(0, Math.min(50, hexData.length())) + "...: " + e.getMessage());
            }
        }
        
        failedRequests++;
        System.err.println("❌ All " + MAX_RETRIES + " attempts failed for: " + hexData.substring(0, Math.min(50, hexData.length())) + "...");
        return false;
    }
    
    /**
     * Single attempt to forward data to backend
     */
    private boolean attemptForward(String hexData, String clientInfo, int attempt) {
        HttpURLConnection connection = null;
        
        try {
            // Create URL and connection
            URL url = new URL(backendUrl);
            connection = (HttpURLConnection) url.openConnection();
            
            // Configure connection for POST request
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "TCP-Ingestion-Daemon/1.0");
            connection.setRequestProperty("Connection", "close");
            
            // Set timeouts
            connection.setConnectTimeout(CONNECT_TIMEOUT);
            connection.setReadTimeout(READ_TIMEOUT);
            
            // Enable input/output
            connection.setDoOutput(true);
            connection.setDoInput(true);
            
            // Create JSON payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("rawHexString", hexData.trim().toUpperCase());
            payload.put("timestamp", Instant.now().toString());
            payload.put("source", "tcp-daemon");
            
            if (clientInfo != null && !clientInfo.trim().isEmpty()) {
                payload.put("clientInfo", clientInfo);
            }
            
            // Convert to JSON
            String jsonPayload = objectMapper.writeValueAsString(payload);
            
            if (attempt == 1) { // Only log on first attempt to avoid spam
                System.out.println("📤 [Attempt " + attempt + "] Forwarding to backend:");
                System.out.println("   URL: " + backendUrl);
                System.out.println("   Hex: " + hexData.substring(0, Math.min(50, hexData.length())) + "...");
                System.out.println("   JSON: " + jsonPayload);
            }
            
            // Write JSON payload
            try (OutputStream os = connection.getOutputStream();
                 OutputStreamWriter writer = new OutputStreamWriter(os, StandardCharsets.UTF_8)) {
                writer.write(jsonPayload);
                writer.flush();
            }
            
            // Get response
            int responseCode = connection.getResponseCode();
            String responseMessage = connection.getResponseMessage();
            
            // Read response body
            String responseBody = readResponse(connection, responseCode >= 400);
            
            if (responseCode >= 200 && responseCode < 300) {
                System.out.println("✅ [Attempt " + attempt + "] Backend success: " + responseCode + " - " + responseMessage);
                if (responseBody != null && !responseBody.trim().isEmpty()) {
                    System.out.println("   Response: " + responseBody.substring(0, Math.min(200, responseBody.length())));
                }
                return true;
            } else {
                System.err.println("❌ [Attempt " + attempt + "] Backend error: " + responseCode + " - " + responseMessage);
                if (responseBody != null && !responseBody.trim().isEmpty()) {
                    System.err.println("   Error response: " + responseBody);
                }
                
                // Don't retry on client errors (4xx)
                if (responseCode >= 400 && responseCode < 500) {
                    System.err.println("   Client error (4xx) - not retrying.");
                    return false;
                }
            }
            
        } catch (IOException e) {
            System.err.println("❌ [Attempt " + attempt + "] Network error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("❌ [Attempt " + attempt + "] Unexpected error: " + e.getMessage());
            e.printStackTrace();
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
        
        return false;
    }
    
    /**
     * Read response from connection
     */
    private String readResponse(HttpURLConnection connection, boolean isError) {
        try {
            InputStream inputStream = isError ? connection.getErrorStream() : connection.getInputStream();
            if (inputStream == null) {
                return null;
            }
            
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line).append('\n');
                }
                return response.toString().trim();
            }
        } catch (IOException e) {
            System.err.println("⚠️ Could not read response: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Test connection to backend
     */
    public boolean testConnection() {
        try {
            System.out.println("🧪 Testing backend connection...");
            
            URL url = new URL(backendUrl.replace("/raw-data", "/health"));
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "TCP-Ingestion-Daemon/1.0");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            
            int responseCode = connection.getResponseCode();
            String responseBody = readResponse(connection, responseCode >= 400);
            
            if (responseCode == 200) {
                System.out.println("✅ Backend health check passed.");
                if (responseBody != null) {
                    System.out.println("   Response: " + responseBody.substring(0, Math.min(200, responseBody.length())));
                }
                return true;
            } else {
                System.err.println("❌ Backend health check failed: HTTP " + responseCode);
                if (responseBody != null) {
                    System.err.println("   Response: " + responseBody);
                }
                return false;
            }
            
        } catch (Exception e) {
            System.err.println("❌ Backend connection test failed: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Get forwarding statistics
     */
    public void printStats() {
        double successRate = totalRequests > 0 ? (successfulRequests * 100.0 / totalRequests) : 0;
        
        System.out.println("📊 HTTP Forwarder Stats:");
        System.out.println("   Total requests: " + totalRequests);
        System.out.println("   Successful: " + successfulRequests);
        System.out.println("   Failed: " + failedRequests);
        System.out.println("   Success rate: " + String.format("%.1f%%", successRate));
    }
    
    /**
     * Shutdown the forwarder
     */
    public void shutdown() {
        System.out.println("🛑 Shutting down HTTP Backend Forwarder...");
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(10, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        printStats();
    }
    
    // Getters for statistics
    public long getTotalRequests() { return totalRequests; }
    public long getSuccessfulRequests() { return successfulRequests; }
    public long getFailedRequests() { return failedRequests; }
}
