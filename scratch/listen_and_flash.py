import serial
import subprocess
import sys
import time
import os

PORT = "COM4"
BUILD_DIR = r"c:\Users\hprad\OneDrive\Desktop\helmet\firmware\build"
BOOTLOADER = os.path.join(BUILD_DIR, "helmet_firmware.ino.bootloader.bin")
PARTITIONS = os.path.join(BUILD_DIR, "helmet_firmware.ino.partitions.bin")
APP_BIN    = os.path.join(BUILD_DIR, "helmet_firmware.ino.bin")

def flash_now():
    print("\n>>> ESP32 IS IN DOWNLOAD MODE! STARTING FLASH NOW... <<<")
    cmd = [
        sys.executable, "-m", "esptool",
        "--chip", "esp32",
        "--port", PORT,
        "--baud", "460800",
        "--before", "no-reset",
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
    return res.returncode == 0

print("=" * 60)
print("LISTENING ON COM4 FOR DOWNLOAD MODE...")
print("To trigger: Hold BOOT -> Tap EN/RST once -> Release BOOT")
print("=" * 60)

start = time.time()
while time.time() - start < 120:
    try:
        s = serial.Serial(PORT, 115200, timeout=1)
        data = s.read(256)
        s.close()
        if b"waiting for download" in data or b"0x13" in data:
            if flash_now():
                print("FLASH COMPLETE!")
                sys.exit(0)
    except Exception as e:
        time.sleep(0.5)

print("Timeout waiting for download mode.")
sys.exit(1)
