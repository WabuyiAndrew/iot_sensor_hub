package com.iot;

/**
 * Main entry point for the TCP Ingestion Daemon
 * This is a simple wrapper to ensure the main class is found
 */
public class Main {
    public static void main(String[] args) {
        System.out.println("🚀 TCP Ingestion Daemon - Main Entry Point");
        System.out.println("============================================");
        
        try {
            // Delegate to the actual daemon
            TcpIngestionDaemon.main(args);
        } catch (Exception e) {
            System.err.println("❌ Failed to start TCP Ingestion Daemon: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
