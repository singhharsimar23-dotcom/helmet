import serial
import time
import sys

def enter_bootloader(port='COM4'):
    print(f"Opening {port}...")
    try:
        s = serial.Serial(port, 115200)
    except Exception as e:
        print(f"Error opening port: {e}")
        return False
        
    print("Testing custom reset sequence...")
    # GPIO0 low, EN low (reset)
    s.setDTR(True)
    s.setRTS(True)
    time.sleep(0.1)
    
    # EN low (reset active), GPIO0 low
    s.setDTR(True)
    s.setRTS(True)
    time.sleep(0.2)
    
    # Release EN while keeping GPIO0 LOW
    s.setRTS(False) # EN goes HIGH (chip wakes up)
    time.sleep(0.1)
    
    # Read any bytes output by ROM bootloader
    deadline = time.time() + 2.0
    output = b""
    while time.time() < deadline:
        if s.in_waiting > 0:
            b = s.read(s.in_waiting)
            output += b
        time.sleep(0.05)
        
    s.setDTR(False)
    s.close()
    
    print(f"Received bytes ({len(output)}): {output[:200]}")
    if b"waiting for download" in output or b"download" in output.lower():
        print("SUCCESS! In download mode.")
        return True
    return False

if __name__ == "__main__":
    enter_bootloader()
