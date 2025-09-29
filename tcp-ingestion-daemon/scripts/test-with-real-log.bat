@echo off
setlocal

echo 🚀 Real Sensor Log Replay - TCP Daemon
echo ========================================

REM === Default values ===
set "LOGFILE=%~1"
set "HOST=%~2"
set "PORT=%~3"
set "DELAY=%~4"

REM === Defaults if not provided ===
if "%LOGFILE%"=="" set "LOGFILE=C:\Users\Andy\Downloads\netty-app-3\netty-app.log"
if "%HOST%"=="" set "HOST=localhost"
if "%PORT%"=="" set "PORT=8081"
if "%DELAY%"=="" set "DELAY=50"

REM === Check if compiled classes exist ===
if not exist "target\classes\com\iot\tools\SensorLogReplayer.class" (
    echo ❌ Compiled classes not found. Please run start-with-maven.bat first.
    pause
    exit /b 1
)

REM === Check if log file exists ===
if not exist "%LOGFILE%" (
    echo ❌ Log file not found: "%LOGFILE%"
    pause
    exit /b 1
)

echo ✅ Using log file: "%LOGFILE%"
echo 🌐 Host: %HOST%
echo 🔌 Port: %PORT%
echo ⏱ Delay: %DELAY% ms
echo.

REM === Run directly from compiled classes without Maven ===
java -cp "target\classes;target\dependency\*" com.iot.tools.SensorLogReplayer "%LOGFILE%" %HOST% %PORT% %DELAY%

echo.
echo 🛑 Replay finished
pause
endlocal
