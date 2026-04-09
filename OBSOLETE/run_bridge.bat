@echo off
title MotuBridge
:loop
cls
echo --- Starting MOTU BRIDGE ---
node MOTU_BRIDGE.js
echo.
echo [!] Script crashed or stopped. Restarting in 3 seconds...
timeout /t 3
goto loop
