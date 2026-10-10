Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AEGIS-IV HELMET FIRMWARE FLASHER (COM4)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ">>> Hold the BOOT button on your ESP32 board for 2 seconds when connecting <<<" -ForegroundColor Yellow
Write-Host ""

$cmd = "python -m esptool --chip esp32 -p COM4 --baud 460800 --connect-attempts 60 --before default-reset --after hard-reset write-flash -z --flash-mode dio --flash-freq 40m --flash-size 4MB 0x1000 firmware\build\helmet_firmware.ino.bootloader.bin 0x8000 firmware\build\helmet_firmware.ino.partitions.bin 0x10000 firmware\build\helmet_firmware.ino.bin"

Invoke-Expression $cmd
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] ESP32 FIRMWARE FLASHED! SYSTEM IS LIVE!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Flashing failed. Please hold BOOT and retry." -ForegroundColor Red
}
