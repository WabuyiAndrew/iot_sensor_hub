#!/bin/bash

# TCP Ingestion System Test Runner
# Comprehensive testing script for the entire IoT pipeline

echo "🚀 TCP Ingestion System - Comprehensive Test Suite"
echo "=================================================="

# Configuration
JAVA_TCP_SERVER_JAR="tcp-ingestion-daemon.jar"
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is running
check_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-10}
    
    print_status "Checking $service_name..."
    
    if curl -s --max-time $timeout "$url" > /dev/null 2>&1; then
        print_success "$service_name is running"
        return 0
    else
        print_error "$service_name is not responding at $url"
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    print_status "Waiting for $service_name to start..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 2 "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within timeout"
    return 1
}

# Pre-flight checks
echo ""
print_status "Pre-flight System Checks"
echo "========================="

# Check Java
if ! command -v java &> /dev/null; then
    print_error "Java is not installed or not in PATH"
    exit 1
fi
print_success "Java is available: $(java -version 2>&1 | head -n 1)"

# Check if TCP server JAR exists
if [ ! -f "$JAVA_TCP_SERVER_JAR" ]; then
    print_warning "TCP server JAR not found: $JAVA_TCP_SERVER_JAR"
    print_status "Please ensure your Java TCP ingestion daemon is built and available"
fi

# Check backend service
if ! check_service "Backend API" "$BACKEND_URL/health"; then
    print_warning "Backend service is not running. Please start it first."
    print_status "Expected: Node.js backend running on port 5000"
fi

# Check frontend service
if ! check_service "Frontend" "$FRONTEND_URL"; then
    print_warning "Frontend service is not running. Please start it first."
    print_status "Expected: React frontend running on port 3000"
fi

# Check MongoDB
print_status "Checking MongoDB connection..."
if curl -s --max-time 5 "$BACKEND_URL/api/users" > /dev/null 2>&1; then
    print_success "Database connection is working"
else
    print_warning "Database connection may have issues"
fi

echo ""
print_status "Compiling Test Classes"
echo "======================"

# Compile test classes
javac -cp ".:gson-2.8.9.jar:java-websocket-1.5.3.jar" testing/*.java

if [ $? -eq 0 ]; then
    print_success "Test classes compiled successfully"
else
    print_error "Failed to compile test classes"
    exit 1
fi

echo ""
print_status "Starting Test Execution"
echo "======================="

# Test 1: Basic TCP Connectivity and Data Transmission
echo ""
print_status "Test 1: TCP Data Transmission"
echo "------------------------------"
java -cp ".:gson-2.8.9.jar" TcpSensorDataTester

# Test 2: WebSocket Real-time Data
echo ""
print_status "Test 2: WebSocket Real-time Data"
echo "--------------------------------"
java -cp ".:gson-2.8.9.jar:java-websocket-1.5.3.jar" WebSocketTester

# Test 3: Load Testing
echo ""
print_status "Test 3: Load Testing"
echo "-------------------"
java -cp ".:gson-2.8.9.jar" LoadTester

# Test 4: API Endpoint Testing
echo ""
print_status "Test 4: API Endpoint Testing"
echo "----------------------------"

# Test backend health
print_status "Testing backend health endpoint..."
response=$(curl -s -w "%{http_code}" "$BACKEND_URL/health")
http_code="${response: -3}"
if [ "$http_code" = "200" ]; then
    print_success "Health endpoint is working"
else
    print_error "Health endpoint returned: $http_code"
fi

# Test sensor data endpoint
print_status "Testing sensor data API..."
test_data='{"rawHexString":"FEDC0A16098522754E000000010020000001900000012C0000003200000050000001F4000007D00000000000000000000000000000000"}'
response=$(curl -s -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$test_data" \
    "$BACKEND_URL/api/sensor/raw-data")
http_code="${response: -3}"
if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    print_success "Sensor data API is working"
else
    print_error "Sensor data API returned: $http_code"
fi

# Test 5: Database Integration
echo ""
print_status "Test 5: Database Integration"
echo "---------------------------"

# Check if data is being stored
print_status "Checking recent sensor data in database..."
response=$(curl -s "$BACKEND_URL/api/sensor/stats")
if echo "$response" | grep -q "totalReadings"; then
    print_success "Database integration is working"
    echo "Recent stats: $response"
else
    print_warning "Could not verify database integration"
fi

# Test 6: Frontend Integration
echo ""
print_status "Test 6: Frontend Integration"
echo "----------------------------"

if check_service "Frontend" "$FRONTEND_URL"; then
    print_status "Testing frontend API calls..."
    
    # Check if frontend can load
    if curl -s "$FRONTEND_URL" | grep -q "root"; then
        print_success "Frontend is loading correctly"
    else
        print_warning "Frontend may have loading issues"
    fi
fi

# Test Summary
echo ""
print_status "Test Summary"
echo "============"

print_success "✅ TCP Data Transmission Test - Completed"
print_success "✅ WebSocket Real-time Test - Completed"  
print_success "✅ Load Testing - Completed"
print_success "✅ API Endpoint Testing - Completed"
print_success "✅ Database Integration Test - Completed"
print_success "✅ Frontend Integration Test - Completed"

echo ""
print_status "Manual Testing Recommendations:"
echo "1. Open frontend at $FRONTEND_URL"
echo "2. Login and navigate to device details"
echo "3. Run: java TcpSensorDataTester (in another terminal)"
echo "4. Observe real-time data updates in the frontend"
echo "5. Check WebSocket status indicator"
echo "6. Verify charts and gauges update with new data"

echo ""
print_success "🎉 Comprehensive test suite completed!"
print_status "Check the output above for any warnings or errors."
