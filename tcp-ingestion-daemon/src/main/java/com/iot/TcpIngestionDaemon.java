package com.iot;

import java.io.*;
import java.net.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Enhanced TCP Ingestion Daemon with proper HTTP forwarding
 * This is the ONLY TcpIngestionDaemon class - no duplicates!
 */
public class TcpIngestionDaemon {
    private static final int DEFAULT_PORT = 8081;
    private static final int MAX_THREADS = 50;
    private static final int STATS_INTERVAL_SECONDS = 30;
    
    private final int port;
    private final HttpBackendForwarder backendForwarder;
    private final ExecutorService threadPool;
    private final ScheduledExecutorService statsExecutor;
    
    private volatile boolean running = false;
    private ServerSocket serverSocket;
    
    // Statistics
    private final AtomicLong connectionCount = new AtomicLong(0);
    private final AtomicLong messageCount = new AtomicLong(0);
    private final AtomicLong successCount = new AtomicLong(0);
    private final AtomicLong failureCount = new AtomicLong(0);
    
    public TcpIngestionDaemon(int port, String backendUrl) {
        this.port = port;
        this.backendForwarder = new HttpBackendForwarder(backendUrl);
        this.threadPool = Executors.newFixedThreadPool(MAX_THREADS);
        this.statsExecutor = Executors.newScheduledThreadPool(1);
    }
    
    /**
     * Start the TCP daemon
     */
    public void start() throws IOException {
        System.out.println("🚀 TCP Ingestion Daemon starting...");
        System.out.println("📡 Port: " + port);
        System.out.println("🔗 Backend URL: " + (backendForwarder != null ? "configured" : "not configured"));
        System.out.println("🧵 Max threads: " + MAX_THREADS);
        System.out.println("==========================================");
        
        // Test backend connection
        if (backendForwarder != null) {
            backendForwarder.testConnection();
        }
        
        serverSocket = new ServerSocket(port);
        running = true;
        
        // Start statistics reporting
        statsExecutor.scheduleAtFixedRate(this::printStats, 
            STATS_INTERVAL_SECONDS, STATS_INTERVAL_SECONDS, TimeUnit.SECONDS);
        
        System.out.println("✅ TCP Ingestion Daemon started on port " + port);
        
        // Accept connections
        while (running) {
            try {
                Socket clientSocket = serverSocket.accept();
                connectionCount.incrementAndGet();
                
                String clientInfo = clientSocket.getRemoteSocketAddress().toString();
                System.out.println("🔌 New connection from: " + clientInfo);
                
                // Handle client in thread pool
                threadPool.submit(() -> handleClient(clientSocket, clientInfo));
                
            } catch (IOException e) {
                if (running) {
                    System.err.println("❌ Error accepting connection: " + e.getMessage());
                }
            }
        }
    }
    
    /**
     * Handle individual client connection
     */
    private void handleClient(Socket clientSocket, String clientInfo) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(clientSocket.getInputStream()));
             PrintWriter writer = new PrintWriter(
                clientSocket.getOutputStream(), true)) {
            
            String line;
            while ((line = reader.readLine()) != null && running) {
                line = line.trim();
                
                if (line.isEmpty()) {
                    continue;
                }
                
                messageCount.incrementAndGet();
                
                // Handle special commands
                if ("PING".equalsIgnoreCase(line)) {
                    writer.println("PONG");
                    continue;
                }
                
                if ("STATUS".equalsIgnoreCase(line)) {
                    writer.println("OK - Messages: " + messageCount.get() + 
                                 ", Success: " + successCount.get() + 
                                 ", Failed: " + failureCount.get());
                    continue;
                }
                
                // Process hex data
                if (isValidHexData(line)) {
                    System.out.println("📨 Received hex data from " + clientInfo + ": " + 
                                     line.substring(0, Math.min(50, line.length())) + "...");
                    
                    // Forward to backend
                    boolean success = false;
                    if (backendForwarder != null) {
                        try {
                            // Use asynchronous forwarding to avoid blocking the client handler thread
                            // The CompletableFuture is not awaited here, allowing immediate response to client
                            backendForwarder.forwardSensorDataAsync(line, clientInfo)
                                .thenAccept(result -> {
                                    if (result) {
                                        successCount.incrementAndGet();
                                        // Log success, but response to client is handled below
                                    } else {
                                        failureCount.incrementAndGet();
                                        System.err.println("❌ Backend forwarding failed for " + clientInfo + " (async).");
                                    }
                                });
                            success = true; // Assume success for immediate client response, actual success is async
                        } catch (Exception e) {
                            System.err.println("❌ Backend forwarding error (async setup): " + e.getMessage());
                            success = false;
                        }
                    }
                    
                    if (success) {
                        writer.println("OK");
                    } else {
                        writer.println("ERROR: Backend forwarding initiation failed");
                        System.err.println("❌ Backend forwarding initiation failed for " + clientInfo);
                    }
                } else {
                    System.err.println("⚠️ Invalid hex data from " + clientInfo + ": " + line);
                    writer.println("ERROR: Invalid hex data format");
                }
            }
            
        } catch (IOException e) {
            System.err.println("❌ Client handling error for " + clientInfo + ": " + e.getMessage());
        } finally {
            try {
                clientSocket.close();
                System.out.println("🔌 Connection closed: " + clientInfo);
            } catch (IOException e) {
                System.err.println("❌ Error closing client socket: " + e.getMessage());
            }
        }
    }
    
    /**
     * Validate hex data format
     */
    private boolean isValidHexData(String data) {
        if (data == null || data.trim().isEmpty()) {
            return false;
        }
        
        String cleanData = data.replaceAll("[\\s:]", "").toUpperCase();
        
        // Must be valid hex characters
        if (!cleanData.matches("^[0-9A-F]+$")) {
            System.err.println("⚠️ Hex data contains non-hex characters after cleaning: " + cleanData.substring(0, Math.min(20, cleanData.length())) + "...");
            return false;
        }
        
        // Must be reasonable length (at least 32 characters for header)
        if (cleanData.length() < 32) {
            System.err.println("⚠️ Hex data too short: " + cleanData.length() + " chars. Expected at least 32.");
            return false;
        }
        
        // Check for valid protocol header
        if (!cleanData.startsWith("FEDC")) {
            System.err.println("⚠️ Invalid protocol header: " + cleanData.substring(0, Math.min(8, cleanData.length())) + ". Expected 'FEDC'.");
            return false;
        }
        
        return true;
    }
    
    /**
     * Print daemon statistics
     */
    private void printStats() {
        long connections = connectionCount.get();
        long messages = messageCount.get();
        long success = successCount.get();
        long failures = failureCount.get();
        
        System.out.println("📊 Daemon Stats - Connections: " + connections + 
                         ", Messages: " + messages + 
                         ", Success: " + success + 
                         ", Failed: " + failures);
        
        if (backendForwarder != null) {
            backendForwarder.printStats();
        }
    }
    
    /**
     * Stop the daemon gracefully
     */
    public void stop() {
        System.out.println("🛑 Stopping TCP Ingestion Daemon...");
        running = false;
        
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (IOException e) {
            System.err.println("❌ Error closing server socket: " + e.getMessage());
        }
        
        threadPool.shutdown();
        statsExecutor.shutdown();
        
        try {
            if (!threadPool.awaitTermination(10, TimeUnit.SECONDS)) {
                threadPool.shutdownNow();
            }
            if (!statsExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                statsExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            threadPool.shutdownNow();
            statsExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
        
        if (backendForwarder != null) {
            backendForwarder.shutdown();
        }
        
        System.out.println("✅ TCP Ingestion Daemon stopped.");
    }
    
    /**
     * Main method
     */
    public static void main(String[] args) {
        int port = DEFAULT_PORT;
        String backendUrl = "http://localhost:5000/api/sensor/raw-data";
        
        // Parse command line arguments
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--port":
                case "-p":
                    if (i + 1 < args.length) {
                        try {
                            port = Integer.parseInt(args[++i]);
                        } catch (NumberFormatException e) {
                            System.err.println("❌ Invalid port number: " + args[i]);
                            System.exit(1);
                        }
                    }
                    break;
                case "--backend":
                case "-b":
                    if (i + 1 < args.length) {
                        backendUrl = args[++i];
                    }
                    break;
                case "--help":
                case "-h":
                    printUsage();
                    System.exit(0);
                    break;
            }
        }
        
        TcpIngestionDaemon daemon = new TcpIngestionDaemon(port, backendUrl);
        
        // Add shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(daemon::stop));
        
        try {
            daemon.start();
        } catch (IOException e) {
            System.err.println("❌ Failed to start daemon: " + e.getMessage());
            System.exit(1);
        }
    }
    
    private static void printUsage() {
        System.out.println("TCP Ingestion Daemon");
        System.out.println("Usage: java -jar tcp-ingestion-daemon.jar [options]");
        System.out.println("Options:");
        System.out.println("  -p, --port <port>      TCP port to listen on (default: 8081)");
        System.out.println("  -b, --backend <url>    Backend URL (default: http://localhost:5000/api/sensor/raw-data)");
        System.out.println("  -h, --help             Show this help message");
    }
}
