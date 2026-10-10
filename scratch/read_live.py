import serial
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("Opening COM4 @ 115200 baud...")
s = serial.Serial('COM4', 115200, timeout=1)

print("Reading live output...")
for _ in range(20):
    line = s.readline().decode('utf-8', errors='replace').strip()
    if line:
        print("[ESP32]:", line)

s.close()
