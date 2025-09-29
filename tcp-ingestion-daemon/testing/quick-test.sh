#!/bin/bash

echo "🚀 Quick TCP Ingestion Test"
echo "=========================="

# Check if services are running
echo "📡 Checking services..."

# Check backend
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running on port 5000"
    echo "   Please start your Node.js backend first"
    exit 1
fi

# Check if TCP port is open
if nc -z localhost 8080 2>/dev/null; then
    echo "✅ TCP server is listening on port 8080"
else
    echo "❌ TCP server is not running on port 8080"
    echo "   Please start your Java TCP ingestion daemon first"
    exit 1
fi

# Compile and run basic test
echo ""
echo "🔧 Compiling test..."
javac -cp ".:gson-2.8.9.jar" TcpSensorDataTester.java

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
    echo ""
    echo "🧪 Running basic connectivity test..."
    java -cp ".:gson-2.8.9.jar" TcpSensorDataTester
else
    echo "❌ Compilation failed"
    exit 1
fi
