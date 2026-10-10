@echo off
title Flashing ESP32 Helmet Firmware
echo ============================================================
echo   AEGIS-IV HELMET FIRMWARE FLASHER (COM4 @ 115200 BAUD)
echo ============================================================
echo.
echo *** HOLD DOWN THE "IO0" BUTTON (Right button) ON YOUR ESP32 ***
echo *** THEN PRESS ANY KEY BELOW TO START FLASHING ***
echo.
pause
python -m esptool --chip esp32 -p COM4 --baud 115200 --connect-attempts 60 --before default-reset --after hard-reset write-flash -z --flash-mode dio --flash-freq 40m --flash-size 4MB 0x1000 firmware\build\helmet_firmware.ino.bootloader.bin 0x8000 firmware\build\helmet_firmware.ino.partitions.bin 0x10000 firmware\build\helmet_firmware.ino.bin
echo.
if %ERRORLEVEL% EQU 0 (
    echo ============================================================
    echo [SUCCESS] ZERO-BUZZ FIRMWARE FLASHED AND RUNNING!
    echo ============================================================
) else (
    echo [ERROR] Upload failed. Make sure you hold IO0 while connecting.
)
pause
