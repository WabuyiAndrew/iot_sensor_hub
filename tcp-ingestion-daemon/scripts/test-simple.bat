@echo off
echo 🧪 Simple Test - TCP Daemon
echo ============================

echo 📦 Quick compile...
call mvn compile -q
if %ERRORLEVEL% neq 0 (
    echo ❌ Compilation failed!
    pause
    exit /b 1
)

echo 🔍 Testing if daemon is running...
ncat -z localhost 8081 2>nul
if %ERRORLEVEL% equ 0 (
    echo ✅ TCP daemon is responding
    
    echo 📤 Sending PING...
    echo PING | ncat localhost 8081 -w 2
    
    echo 📊 Getting STATUS...
    echo STATUS | ncat localhost 8081 -w 2
    
    echo 📡 Sending test hex data...
    echo FEDC0116098522754E0000000103001E00000032000000640000000A00000014000000050000012C000000500000000000000001 | ncat localhost 8081 -w 5
    
) else (
    echo ❌ TCP daemon is not running
    echo 💡 Start it with: scripts\start-daemon-fixed.bat
)

pause
