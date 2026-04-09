@echo off
title MotuMonitor
:loop
cls
echo --- Starting MOTU MONITOR ---
node MOTU_MONITOR.js
echo.
echo [!] Script crashed or stopped. Restarting in 3 seconds...
echo [!] (Or run your launcher.bat to restart immediately)
timeout /t 3
goto loop
