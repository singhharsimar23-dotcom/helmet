import subprocess
import time
import sys
import os

BUILD_DIR = r"c:\Users\hprad\OneDrive\Desktop\helmet\firmware\build"
BOOTLOADER = os.path.join(BUILD_DIR, "helmet_firmware.ino.bootloader.bin")
PARTITIONS = os.path.join(BUILD_DIR, "helmet_firmware.ino.partitions.bin")
APP_BIN    = os.path.join(BUILD_DIR, "helmet_firmware.ino.bin")
PORT       = "COM4"
BAUD       = "460800"

print("=" * 60)
print("AEGIS-IV ESP32 AUTOMATED FLASHER")
print("Press and HOLD the physical BOOT button on the ESP32 now...")
print("=" * 60)

cmd = [
    sys.executable, "-m", "esptool",
    "--chip", "esp32",
    "--port", PORT,
    "--baud", BAUD,
    "--connect-attempts", "15",
    "--before", "default-reset",
    "--after", "hard-reset",
    "write-flash",
    "-z",
    "--flash_mode", "dio",
    "--flash_freq", "40m",
    "--flash_size", "4MB",
    "0x1000", BOOTLOADER,
    "0x8000", PARTITIONS,
    "0x10000", APP_BIN
]

for attempt in range(1, 4):
    print(f"\n[Attempt {attempt}/3] Connecting to ESP32 on {PORT}...")
    res = subprocess.run(cmd)
    if res.returncode == 0:
        print("\n" + "=" * 60)
        print(">>> FLASH SUCCESSFUL! ESP32 FIRMWARE IS FULLY INSTALLED! <<<")
        print("=" * 60)
        sys.exit(0)
    time.sleep(1)

print("\nFlashing failed. The BOOT button must be held down while connecting.")
sys.exit(1)
