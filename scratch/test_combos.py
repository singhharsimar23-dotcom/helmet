import serial
import time

s = serial.Serial('COM4', 115200)

for dtr, rts, delay in [
    (False, True, 0.5),
    (True, False, 0.5),
    (True, True, 0.5),
    (False, False, 0.5),
]:
    print(f"\n--- Testing DTR={dtr}, RTS={rts} ---")
    s.setDTR(dtr)
    s.setRTS(rts)
    time.sleep(delay)
    # now release reset
    s.setRTS(not rts)
    time.sleep(0.5)
    if s.in_waiting:
        data = s.read(s.in_waiting).decode('latin1', errors='ignore')
        for line in data.splitlines():
            if "boot:" in line or "rst:" in line or "waiting" in line:
                print("Line:", line)

s.close()
