@echo off
:: Set the working directory variable
set "TARGET_DIR=C:\Users\SD4RM\Documents\MOTU"

:: 1. Kill any existing tabs with these specific titles first
:: taskkill /fi "windowtitle eq MotuMonitor*" /f >nul 2>&1
:: taskkill /fi "windowtitle eq MotuBridge*" /f >nul 2>&1

:: Launch with suppressApplicationTitle to keep your custom labels
wt -w 0 nt -d "%TARGET_DIR%" --title "MotuMonitor" --suppressApplicationTitle cmd /k nodemon MOTU_MONITOR.js ; ^
      nt -d "%TARGET_DIR%" --title "MotuBridge" --suppressApplicationTitle cmd /k nodemon MOTU_BRIDGE.js


:: 2. Launch the new tabs in the existing window (-w 0) 
:: -d sets the starting directory for the node command
::wt -w 0 nt -d "C:\Users\SD4RM\Documents\MOTU" cmd /k nodemon  MOTU_MONITOR.js
::wt -w 0 nt -d "C:\Users\SD4RM\Documents\MOTU" cmd /k nodemon  MOTU_BRIDGE.js

:: 3. Focus the existing window
::wt -w MOTU_SESSION focus-tab --title "MotuMonitor"::

