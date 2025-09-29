package com.iot;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for HttpBackendForwarder
 */
public class HttpBackendForwarderTest {
    
    private HttpBackendForwarder forwarder;
    
    @BeforeEach
    void setUp() {
        forwarder = new HttpBackendForwarder("http://localhost:5000/api/sensor/raw-data");
    }
    
    @AfterEach
    void tearDown() {
        if (forwarder != null) {
            forwarder.shutdown();
        }
    }
    
    @Test
    void testValidHexDataForwarding() {
        String validHexData = "FEDC0116098522754E0000000103001E00000032000000640000000A00000014000000050000012C000000500000000000000001";
        
        // This test requires the backend to be running
        // In a real test environment, you might want to mock the HTTP calls
        System.out.println("Testing hex data forwarding with: " + validHexData);
        
        // Test connection first
        boolean connectionOk = forwarder.testConnection();
        System.out.println("Backend connection test: " + (connectionOk ? "PASSED" : "FAILED"));
        
        if (connectionOk) {
            boolean result = forwarder.forwardSensorData(validHexData, "test-client");
            System.out.println("Data forwarding test: " + (result ? "PASSED" : "FAILED"));
        }
    }
    
    @Test
    void testInvalidHexData() {
        // Test with null data
        boolean result1 = forwarder.forwardSensorData(null, "test-client");
        assertFalse(result1, "Should fail with null data");
        
        // Test with empty data
        boolean result2 = forwarder.forwardSensorData("", "test-client");
        assertFalse(result2, "Should fail with empty data");
        
        // Test with whitespace only
        boolean result3 = forwarder.forwardSensorData("   ", "test-client");
        assertFalse(result3, "Should fail with whitespace only");
    }
    
    @Test
    void testStatistics() {
        // Initial stats should be zero
        assertEquals(0, forwarder.getTotalRequests());
        assertEquals(0, forwarder.getSuccessfulRequests());
        assertEquals(0, forwarder.getFailedRequests());
        
        // Test with invalid data to increment failed requests
        forwarder.forwardSensorData("", "test-client");
        
        assertEquals(1, forwarder.getTotalRequests());
        assertEquals(0, forwarder.getSuccessfulRequests());
        assertEquals(1, forwarder.getFailedRequests());
    }
}
