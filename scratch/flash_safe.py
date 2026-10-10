import subprocess
import sys
import os

BUILD_DIR = r"c:\Users\hprad\OneDrive\Desktop\helmet\firmware\build"
BOOTLOADER = os.path.join(BUILD_DIR, "helmet_firmware.ino.bootloader.bin")
PARTITIONS = os.path.join(BUILD_DIR, "helmet_firmware.ino.partitions.bin")
APP_BIN    = os.path.join(BUILD_DIR, "helmet_firmware.ino.bin")
PORT       = "COM4"
BAUD       = "115200"

print("=" * 60)
print("AEGIS-IV FIRMWARE SAFE FLASHER (115200 BAUD)")
print("Please HOLD the IO0 button on the ESP32 now...")
print("=" * 60)

cmd = [
    sys.executable, "-m", "esptool",
    "--chip", "esp32",
    "--port", PORT,
    "--baud", BAUD,
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
    print("\n" + "=" * 60)
    print(">>> FLASH SUCCESSFUL! ZERO-BUZZ FIRMWARE INSTALLED! <<<")
    print("=" * 60)
    sys.exit(0)
else:
    print("\nFlash exited with code:", res.returncode)
    sys.exit(res.returncode)
