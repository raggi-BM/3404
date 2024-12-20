## Tested and worked on windows 10 

#### Create the batch file:

```
@echo off
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://10.16.27.157:5000/input --user-data-dir="C:\Users\<user>\AppData\Local\Google\Chrome\User Data\Profile 1" --disable-translate --no-first-run --disable-infobars --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI,AutofillKeyPressTriggeredHeuristic --disable-gesture-requirement-for-media-playback --disable-sync --no-default-browser-check --disable-extensions --disable-pdf-viewer-update --disable-new-tab-first-run --unsafely-treat-insecure-origin-as-secure=http://10.16.27.157:5000/input --disable-web-security --allow-running-insecure-content --use-fake-ui-for-media-stream
exit
```

- Save the batch file as chrome-kiosk.bat (e.g., on your C:\ drive).
Open Group Policy Editor:

- Press Win + R, type gpedit.msc, and hit Enter.
Navigate to Custom User Interface:

- Go to User Configuration → Administrative Templates → System → Custom User Interface.
Enable Custom User Interface:

- Double-click Custom User Interface, select Enabled.
Point to the Batch File:

- In the Interface File Name field, type the path to your batch file:
vbnet

- C:\path\to\chrome-kiosk.bat
Apply and Reboot:

- Click OK, apply changes, and restart your computer.




## Steps to Allow Only spesisific USB devices

Have not tested this solution yet

Find the USB devices Hardware ID:

Press Win + X, select Device Manager.
Find your microphone under Sound, video and game controllers, right-click, select Properties.
Go to Details tab, choose Hardware Ids, and note the top-most ID (e.g., USB\VID_XXXX&PID_YYYY).
Open Group Policy Editor:

Press Win + R, type gpedit.msc, and hit Enter.
Navigate to Device Installation Restrictions:

Go to Computer Configuration → Administrative Templates → System → Device Installation → Device Installation Restrictions.
Block All USB Devices:

Double-click Prevent installation of devices not described by other policy settings.
Select Enabled, click OK.
Allow USB Microphone by Hardware ID:

Double-click Allow installation of devices that match any of these device IDs.
Select Enabled, click Show.
Enter the Hardware ID of the microphone (e.g., USB\VID_XXXX&PID_YYYY), click OK.
Apply and Reboot:

Click OK to apply changes.
Restart the computer to enforce the new USB restrictions.
Now, only the microphone will be allowed, and all other USB devices will be blocked for this session.


alternative solution

conditional usb device access

```
@echo off

# Start Chrome in kiosk mode
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk http://10.16.27.157:5000/input --user-data-dir="C:\Users\<YourUsername>\AppData\Local\Google\Chrome\User Data\Profile 1" --disable-translate --no-first-run --disable-infobars --disable-pinch --disable-features=TranslateUI --allow-running-insecure-content

# Run PowerShell script to enforce USB policy conditionally
powershell -ExecutionPolicy Bypass -Command "& {
    $allowedHardwareId = 'USB\\VID_XXXX&PID_YYYY'; # Replace with your microphone's actual Hardware ID
    $regPath = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeviceInstall\\Restrictions';

    # Create the registry path if it doesn't exist
    if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force }

    # Block all USB devices except the allowed microphone
    Set-ItemProperty -Path $regPath -Name 'DenyUnspecified' -Value 1;
    $allowedIdsPath = '$regPath\\AllowDeviceIDs';
    if (-not (Test-Path $allowedIdsPath)) { New-Item -Path $allowedIdsPath -Force }
    Set-ItemProperty -Path $allowedIdsPath -Name '1' -Value $allowedHardwareId;

    # After session, remove the restriction
    Start-Sleep -Seconds 3600; # Set the session duration (1 hour in this example)
    Set-ItemProperty -Path $regPath -Name 'DenyUnspecified' -Value 0;
    Remove-Item -Path $allowedIdsPath -Recurse;
}"
```

we will need to test this solution and see if it works
