@echo off
cls
echo ============================================================
echo   AEGIS-IV FIRMWARE FLASHER (ESP32 on COM4)
echo ============================================================
echo.
echo TO ENTER FLASH MODE:
echo 1. PRESS AND HOLD the BOOT button (right button)
echo 2. While holding BOOT, TAP the EN button (left button next to USB)
echo 3. RELEASE the BOOT button
echo.
echo Once you have done that, press any key to flash...
pause >nul
echo.
echo Flashing firmware at 460800 baud...
python -m esptool --chip esp32 -p COM4 --baud 460800 --connect-attempts 15 --before no-reset --after hard-reset write-flash -z --flash-mode dio --flash-freq 40m --flash-size 4MB 0x1000 "firmware\build\helmet_firmware.ino.bootloader.bin" 0x8000 "firmware\build\helmet_firmware.ino.partitions.bin" 0x10000 "firmware\build\helmet_firmware.ino.bin"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Firmware Flashed Successfully!
    echo Press the EN button once to start the helmet.
    echo Open http://localhost:8080 and click CONNECT USB.
    echo ============================================================
) else (
    echo.
    echo [FAILED] If it timed out, hold BOOT and tap EN again, then rerun.
)
echo.
pause
