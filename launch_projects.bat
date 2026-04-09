@echo off
:: Launch MOTU: Forces a new window with the MOTU Profile and the MOTU Workspace
start "" code --new-window --profile "MOTU" "C:\Users\SD4RM\Documents\.AUDIO\MOTU\motu-system.code-workspace"

:: Launch Windhawk: Forces a new window with the Windhawk Profile
start "" code --new-window --profile "Windhawk" "C:\Users\SD4RM\Documents\Windhawk"

:: Launch Home: Opens the Default profile with your preserved Home Workspace
start "" code --new-window --profile "Default" "C:\Users\SD4RM\Documents\home.code-workspace"

exit
