import serial
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("Connecting to COM4 @ 115200...")
try:
    s = serial.Serial('COM4', 115200, timeout=1.0)
    time.sleep(1.0)
    s.reset_input_buffer()

    print("\n--- 1. TESTING BUZZER ON GPIO 23 (800ms PULSE) ---")
    s.write(b"BUZZ\n")
    s.flush()
    time.sleep(1.0)
    while s.in_waiting:
        print("[ESP32]:", s.readline().decode('utf-8', errors='replace').strip())

    print("\n--- 2. READING CURRENT PIN STATUS ---")
    s.write(b"STATUS\n")
    s.flush()
    time.sleep(0.5)
    while s.in_waiting:
        line = s.readline().decode('utf-8', errors='replace').strip()
        if "[STATUS]" in line:
            print("[PIN STATUS]:", line)

    print("\n--- 3. LIVE MONITORING FOR 10 SECONDS (PUT HAND IN FRONT OF SENSOR NOW) ---")
    start = time.time()
    while time.time() - start < 10.0:
        if s.in_waiting:
            line = s.readline().decode('utf-8', errors='replace').strip()
            if "obstacle" in line or "ECHO" in line:
                print(line)
        time.sleep(0.05)

    s.close()
    print("\nTest completed.")
except Exception as e:
    print("Error:", e)
