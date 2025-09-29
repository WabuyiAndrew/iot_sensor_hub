#!/bin/bash

echo "🔧 Manual TCP Test - Sending Sample Data"
echo "========================================"

# Sample hex data for air quality sensor
HEX_DATA="FEDC0A16098522754E123456780100200000019000000190000000320000005000000064000007D000000000000000000000000"

echo "📤 Sending sample sensor data to TCP server..."
echo "   Data: $HEX_DATA"
echo "   Target: localhost:8080"

# Send data using netcat
echo "$HEX_DATA" | nc localhost 8080

if [ $? -eq 0 ]; then
    echo "✅ Data sent successfully"
    echo ""
    echo "🔍 Check your backend logs and frontend for updates"
    echo "   Backend: http://localhost:5000/api/sensor/stats"
    echo "   Frontend: http://localhost:3000"
else
    echo "❌ Failed to send data"
    echo "   Make sure TCP server is running on port 8080"
fi
