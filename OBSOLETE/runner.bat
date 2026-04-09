@echo off
set "TARGET_DIR=C:\Users\SD4RM\Documents\MOTU"

:: 1. SIGNAL RESTART: Kill the background node processes. 
:: This triggers the 'watchdog.bat' already sitting in your tabs to loop.
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*MOTU_MONITOR.js*' -or $_.CommandLine -like '*MOTU_BRIDGE.js*' } | Stop-Process -Force"

:: 2. PREVENT DUPLICATION: Only open the tabs if they aren't already running.
tasklist /v /fi "imagename eq cmd.exe" | findstr /i "MotuMonitor MotuBridge" >nul
if %errorlevel% neq 0 (
    wt -w MOTU_WINDOW nt -d "%TARGET_DIR%" --title "MotuMonitor" cmd /c watchdog.bat MOTU_MONITOR.js MotuMonitor ; ^
       -w MOTU_WINDOW nt -d "%TARGET_DIR%" --title "MotuBridge"  cmd /c watchdog.bat MOTU_BRIDGE.js MotuBridge
) else (
    echo [!] MOTU tabs already open. Scripts have been restarted in-place.
)

:: 3. Focus the existing window
wt -w MOTU_WINDOW focus-tab --title "MotuMonitor"
