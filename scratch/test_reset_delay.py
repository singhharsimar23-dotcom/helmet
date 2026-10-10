import serial
import time
from esptool.reset import classic_bootloader_reset

s = serial.Serial('COM4', 115200)

for rd in [0.2, 0.5, 0.8, 1.0]:
    print(f"\n--- Testing reset_delay={rd} with flow_control=True ---")
    classic_bootloader_reset(s, enter_boot_delay=0.3, reset_delay=rd, flow_control=True)
    time.sleep(0.5)
    if s.in_waiting:
        data = s.read(s.in_waiting).decode('latin1', errors='ignore')
        for line in data.splitlines():
            if "boot:" in line or "rst:" in line or "waiting" in line:
                print("Line:", line)

s.close()
