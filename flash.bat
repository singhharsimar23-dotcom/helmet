@echo off
echo ============================================================
echo   AEGIS-IV v4.0 FIRMWARE FLASHER
echo   ESP32 on COM4 (Silicon Labs CP210x)
echo ============================================================
echo.
echo STEP 1: Hold the BOOT button on your ESP32 board
echo STEP 2: Press and release the EN/RST button once
echo STEP 3: Release BOOT button
echo STEP 4: Press any key here to start flashing...
echo.
pause
echo.
echo Flashing firmware...
python -m esptool --chip esp32 -p COM4 --baud 460800 --connect-attempts 5 --before no-reset --after hard-reset write-flash -z --flash-mode dio --flash-freq 40m --flash-size 4MB 0x1000 "firmware\build\helmet_firmware.ino.bootloader.bin" 0x8000 "firmware\build\helmet_firmware.ino.partitions.bin" 0x10000 "firmware\build\helmet_firmware.ino.bin"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Firmware v4.0 flashed! ESP32 is rebooting...
    echo Open the dashboard and click CONNECT USB to start.
) else (
    echo.
    echo [FAILED] Make sure you held BOOT then tapped EN/RST before pressing a key.
    echo Try again.
)
pause
