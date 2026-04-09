@echo off
set "SCRIPT_NAME=%~1"
set "TITLE_NAME=%~2"
title %TITLE_NAME%

:loop
cls
echo [%TIME%] --- RUNNING %SCRIPT_NAME% ---
:: Run node and wait for it to finish or be killed
node %SCRIPT_NAME%
echo.
echo [!] %SCRIPT_NAME% stopped or crashed.
echo [!] Waiting for restart signal (or press any key to restart manually)...
pause
goto loop
