# AEGIS-IV HELMET SYSTEM // AI AGENT HANDOVER CONTEXT

## 1. ESP32 HARDWARE FLASHING & UPLOAD WORKFLOW

### The Flashing Problem & Hardware Architecture:
- **Board:** ESP32 NodeMCU / DevKit (CP210x USB-to-UART bridge on **COM4**).
- **Physical Buttons on ESP32:**
  - **Left Button (next to micro-USB):** `EN` (Hardware Reset).
  - **Right Button:** `BOOT` (strapping pin GPIO 0).
- **Why Standard Automatic Flashing Fails:**
  The auto-reset circuit (DTR/RTS pulsing) on this CP210x board has capacitor timing issues on Windows. When `esptool` attempts an automatic reset, the chip detects boot mode `0x17` (Normal SPI Flash Boot) rather than `0x13` (Download Mode), throwing:
  `ERROR: Failed to connect to ESP32: Wrong boot mode detected (0x17)! The chip needs to be in download mode.`
  Or if reset during packet transmission, it outputs ROM string `ets Jul 29...` at 115200 baud, causing `Invalid head of packet (0x65)`.

### The Proven Flashing Method:
1. **COM Port Precondition:**
   Windows allows only ONE process to open `COM4`. If the user has clicked "CONNECT USB" in Chrome/Edge at `http://localhost:8080`, Web Serial holds an exclusive lock. Any terminal command will immediately fail with `PermissionError(13, 'Access is denied.')`.
   **The user MUST click DISCONNECT in the dashboard (or close the tab) before flashing.**
2. **Physical Button Sequence for Download Mode:**
   - **Step 1:** Press and **HOLD the BOOT button** (right button).
   - **Step 2:** While holding BOOT, **TAP the EN button** (left button next to USB) once.
   - **Step 3:** Keep holding BOOT for 1-2 seconds, then release.
3. **The 100% Working Upload Command (Native Arduino-CLI):**
   ```powershell
   & "C:\Users\hprad\AppData\Local\Temp\arduino-cli\arduino-cli.exe" upload -p COM4 --fqbn esp32:esp32:esp32 "c:\Users\hprad\OneDrive\Desktop\helmet\firmware\helmet_firmware"
   ```
   *Note:* The sketch path must be the folder `firmware\helmet_firmware`, which contains `helmet_firmware.ino`.
   Arduino-CLI uses `esptool.py v4.5.1` at 921,600 baud, writing the bootloader, partitions, and 297KB firmware image in ~3.5 seconds with hash verification.
4. **Booting Normal Mode Post-Flash:**
   After flashing finishes (`Leaving... Hard resetting via RTS pin`), tap **EN** once or replug the USB cable to ensure normal application startup.

---

## 2. PIN MAP & SENSOR TELEMETRY PROTOCOL

Baud rate: **115200 Baud** | Frequency: **4 Hz (250ms)** | Format: **JSON Line**

```json
{"roll":23.2,"pitch":-16.5,"yaw":180,"gforce":0.858,"ax":0.223,"ay":0.341,"az":0.755,"ambTemp":35.2,"hum":38.0,"gas":693,"co":4095,"ir":0,"obstacle":0,"dist":999,"lat":23.161000,"lng":77.106000,"alt":498,"sats":0,"gps_status":"INDOOR_BASE_LOCK","battery":95,"buzzer":0,"sos":0}
```

| Sensor | ESP32 Pin | Logic / Protocol | Dashboard Behavior |
| :--- | :--- | :--- | :--- |
| **MPU-6050** | `21` (SDA), `22` (SCL) | I2C `0x68` | Complementary pitch/roll filter live. Level horizon = 0.0°. |
| **DHT22** | `4` | Bit-bang 1-Wire | Real `ambTemp` (~35°C), `hum` (~38%). Safe fallback if unplugged. |
| **MQ-135** | `34` (ADC1_CH6) | Analog 0–4095 | Output `gas`: ~650–770 AO counts (Atmosphere Clear / Nominal). |
| **MQ-7 (CO)** | `35` (ADC1_CH7) | Analog 0–4095 | Output `co`: Reads `4095 AO` (saturated baseline / pre-heating). |
| **IR Proximity**| `18` ONLY | Digital `INPUT_PULLUP` | Active-LOW. Object in front -> `ir=1`, `obstacle=1`, buzzer ON. |
| **SOS Button** | `19` + `0` (onboard BOOT)| Digital `INPUT_PULLUP` | Active-LOW latch. Press -> `sos=1`, buzzer beeps 3x, overlay ON. |
| **Piezo Buzzer**| `23` | Digital Output | Active-HIGH digital drive. |
| **GPS** | `16` (RX2), `17` (TX2) | Serial2 @ 9600 Bd | Indoor base anchor: Kotri Kalan, MP (`23.161000°N, 77.106000°E`). |

---

## 3. ROOT CAUSE SUMMARY OF RECENT BUGS

### Bug 1: Visor Proximity Rapid Green/Red Shuffling
- **Cause:** Firmware was checking `GPIO 18 || GPIO 5 || GPIO 14`. Pins 5 and 14 are not connected and floated, generating random CMOS capacitive noise that flipped the sensor state every cycle.
- **Fix:** Fixed to read **strictly GPIO 18**.

### Bug 2: Physical SOS Ringing Buzzer But Not Showing on Dashboard
- **Cause 1:** Firmware debounced toggled state (`!isDistressActive`). Switch contact bounce on release rapidly reverted state from `true` back to `false`.
- **Fix 1:** Changed firmware to **latch ON only** (`isDistressActive = true`). Clearing requires dashboard `CMD:SOS_OFF`.
- **Cause 2:** In `app.js`, `updateDashboardUI()` auto-hid the overlay on any packet with `sos=0`.
- **Fix 2:** Latched `state._sosLatched = true` in `app.js` upon receiving `t.sos === true`. It remains on screen until the user clicks the "CANCEL SOS / ALL CLEAR" button.

### Bug 3: MQ-7 Gas Sensor Showing "NOT CONNECTED"
- **Cause:** `app.js` treated readings $\ge 4080\text{ AO}$ as an unplugged floating ADC pin.
- **Fix:** Code now displays `${rawAo} AO // PRE-HEATING / SENSOR HIGH`, verifying live hardware communication.

---

## 4. DEPLOYMENT STATUS (UPDATED)
- **Firmware Compilation:** ✅ Succeeded with `arduino-cli` (v4.0 patched).
- **ESP32 Flashing:** ✅ Succeeded via `esptool v5.5.0` on COM4 at 460,800 baud (Bootloader, Partitions, Application verified).
- **Dashboard Web UI:** ✅ Running on `http://localhost:8080` with cache-busted `app.js?v=4.2`.

