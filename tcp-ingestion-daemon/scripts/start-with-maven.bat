@echo off
echo 🚀 Starting TCP Daemon with Maven Exec...
echo =========================================

echo 📦 Building project...
call mvn clean compile -q
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo ✅ Build successful!
echo.
echo 🔧 Starting TCP daemon on port 8081...
echo 🔗 Backend URL: http://localhost:5000/api/sensor/raw-data
echo 🛑 Press Ctrl+C to stop
echo.

REM Use Maven exec plugin which handles classpath automatically
call mvn exec:java -Dexec.mainClass="com.iot.TcpIngestionDaemon" -Dexec.classpathScope=compile

pause
