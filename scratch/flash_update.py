import subprocess
import time
import sys
import os
import serial

PORT = "COM4"
BUILD_DIR = r"c:\Users\hprad\OneDrive\Desktop\helmet\firmware\build"
BOOTLOADER = os.path.join(BUILD_DIR, "helmet_firmware.ino.bootloader.bin")
PARTITIONS = os.path.join(BUILD_DIR, "helmet_firmware.ino.partitions.bin")
APP_BIN    = os.path.join(BUILD_DIR, "helmet_firmware.ino.bin")

print("=" * 60, flush=True)
print("AEGIS-IV FIRMWARE UPDATE (KOTRI KALAN GPS + UNIVERSAL PROXIMITY)", flush=True)
print("=" * 60, flush=True)

# 1. Wait for COM4 to be released by browser
print("\n[Step 1] Checking if COM4 is available...", flush=True)
while True:
    try:
        s = serial.Serial(PORT, 115200)
        s.close()
        print("[Step 1] COM4 is available and ready!", flush=True)
        break
    except Exception:
        print("[Waiting] COM4 is locked by the browser. Please click the red 'DISCONNECT' button in the dashboard...", flush=True)
        time.sleep(2)

# 2. Flash using esptool
print("\n[Step 2] Ready to flash! Hold down the IO0 button on the ESP32 now...", flush=True)
cmd = [
    sys.executable, "-m", "esptool",
    "--chip", "esp32",
    "--port", PORT,
    "--baud", "460800",
    "--connect-attempts", "60",
    "--before", "default-reset",
    "--after", "hard-reset",
    "write-flash",
    "-z",
    "--flash-mode", "dio",
    "--flash-freq", "40m",
    "--flash-size", "4MB",
    "0x1000", BOOTLOADER,
    "0x8000", PARTITIONS,
    "0x10000", APP_BIN
]

res = subprocess.run(cmd)
if res.returncode == 0:
    print("\n" + "=" * 60, flush=True)
    print(">>> SUCCESS! UPDATED FIRMWARE FLASHED! <<<", flush=True)
    print("Coordinates: Kotri Kalan, MP (23.1610°N, 77.1060°E)", flush=True)
    print("Proximity: Dual-mode ultrasonic + IR active", flush=True)
    print("=" * 60, flush=True)
    sys.exit(0)
else:
    print("\nFlash exited with code:", res.returncode, flush=True)
    sys.exit(res.returncode)
