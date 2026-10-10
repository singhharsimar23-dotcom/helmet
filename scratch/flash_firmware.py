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
print("AEGIS-IV ESP32 DIRECT FLASH UTILITY")
print("Target Port: " + PORT)
print("Bootloader:  " + BOOTLOADER)
print("Partitions:  " + PARTITIONS)
print("Firmware:    " + APP_BIN)
print("=" * 60)

cmd = [
    sys.executable, "-m", "esptool",
    "--chip", "esp32",
    "--port", PORT,
    "--baud", BAUD,
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

print("Executing: " + " ".join(cmd))
res = subprocess.run(cmd)
sys.exit(res.returncode)
