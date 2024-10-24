@echo off

rem Start TeamViewer minimized using PowerShell. 
rem Make sure to change the path to the TeamViewer executable if necessary.
powershell -command "Start-Process 'C:\Program Files\TeamViewer\TeamViewer.exe' -WindowStyle Hidden"

rem Start Chrome in kiosk mode. 
rem Change the --kiosk http://(ip-address) to the ip-address of the mac-mini. 
rem Make sure to change the path to the Chrome executable.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://10.16.27.157:5000/input --user-data-dir="C:\Users\omiblomi\AppData\Local\Google\Chrome\User Data\Profile 1" --disable-translate --no-first-run --disable-infobars --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI,AutofillKeyPressTriggeredHeuristic --disable-gesture-requirement-for-media-playback --disable-sync --no-default-browser-check --disable-extensions --disable-pdf-viewer-update --disable-new-tab-first-run --unsafely-treat-insecure-origin-as-secure=http://10.16.27.157:5000/input --disable-web-security --allow-running-insecure-content --use-fake-ui-for-media-stream
exit

