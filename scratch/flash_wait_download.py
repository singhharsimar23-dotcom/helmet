import subprocess
import time
import sys
import os

PORT = "COM4"
BUILD_DIR = r"c:\Users\hprad\OneDrive\Desktop\helmet\firmware\build"
BOOTLOADER = os.path.join(BUILD_DIR, "helmet_firmware.ino.bootloader.bin")
PARTITIONS = os.path.join(BUILD_DIR, "helmet_firmware.ino.partitions.bin")
APP_BIN    = os.path.join(BUILD_DIR, "helmet_firmware.ino.bin")

cmd = [
    sys.executable, "-m", "esptool",
    "--chip", "esp32",
    "--port", PORT,
    "--baud", "460800",
    "--connect-attempts", "3",
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

print("=" * 60, flush=True)
print("LISTENING FOR DOWNLOAD MODE (HOLD IO0 -> TAP EN -> RELEASE IO0)...", flush=True)
print("=" * 60, flush=True)

for attempt in range(1, 40):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print("\n" + "=" * 60, flush=True)
        print(">>> SUCCESS! 100% PRODUCTION FIRMWARE FLASHED! <<<", flush=True)
        print("=" * 60, flush=True)
        print(res.stdout, flush=True)
        sys.exit(0)
    elif "Wrong boot mode detected" in res.stderr:
        print(f"[{attempt}/40] Chip is running in normal mode (0x17). Please HOLD IO0 and TAP EN now...", flush=True)
    else:
        print(f"[{attempt}/40] Waiting for download mode on {PORT}...", flush=True)
    time.sleep(1)

print("Timeout waiting for download mode.", flush=True)
sys.exit(1)
