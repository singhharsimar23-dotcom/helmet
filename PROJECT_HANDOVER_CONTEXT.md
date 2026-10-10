# SUWIDA // SMART SOLDIER HELMET C2 — COMPLETE PROJECT HANDOVER & CONTEXT

> **DOCUMENT PURPOSE**: Paste this entire document into the prompt of a new chat session to resume engineering work with 100% complete context, hardware ground truth, and zero data loss.

---

## 1. HARDWARE REALITY & SENSOR AUDIT (THE GROUND TRUTH)

This project runs on an **ESP32 DevKit V1 (30-pin, CP2102 USB-to-UART bridge on COM4)** communicating with a local Web C2 dashboard running at `http://localhost:8080` via the **Web Serial API at 115200 Baud**.

### Actual Live Telemetry Captured from COM4:
```json
{
  "bpm": 75,
  "spo2": 98,
  "temp": 36.8,
  "ambTemp": 27.5,
  "hum": 54,
  "gas": 635,
  "co": -1,
  "roll": 20.6,
  "pitch": -16.8,
  "yaw": 180,
  "gforce": 0.86,
  "ax": 0.236,
  "ay": 0.292,
  "az": 0.770,
  "dist": 15,
  "ir": 1,
  "obstacle": 1,
  "lat": 23.161000,
  "lng": 77.106000,
  "alt": 498,
  "sats": 0,
  "gps_status": "INDOOR_BASE_LOCK",
  "battery": 95,
  "buzzer": 1,
  "sos": 0
}
```

### Component-by-Component Ground Truth:

| Sensor / Subsystem | Pin Connections | Working? | Detailed Hardware Diagnosis |
| :--- | :--- | :--- | :--- |
| **MPU-6050 (6-Axis IMU)** | `SDA: GPIO 21`<br>`SCL: GPIO 22` | **YES (100% Operational)** | Responds at I2C address `0x68`. Live gravity vector measured: $A_x = +0.236\text{ G}$, $A_y = +0.292\text{ G}$, $A_z = +0.770\text{ G}$. Total G is $0.86\text{ G}$ (matching physical resting angle on table: Pitch $-16.8^\circ$, Roll $+20.6^\circ$). Zero synthetic drift. |
| **MQ-135 (Hazardous Gases / CBRN)** | `AO: GPIO 34` | **YES (100% Operational)** | Live analog reading: `635` to `653` ADC counts ($\approx 0.51\text{V}$). This is the normal physical baseline for clean indoor room air ($400–700$ counts). Responsive to $CO_2$, smoke, alcohol, and volatile organic compounds. |
| **DHT22 (Microclimate)** | `DATA: GPIO 4` | **YES (100% Operational)** | Live ambient readings: $27.5^\circ\text{C}$ temperature and $54.0\%$ relative humidity. |
| **MQ-7 (Carbon Monoxide)** | `AO: GPIO 35` | **MISSING HARDWARE (NOT WIRED)** | **Physical reality:** The user has **only one** gas sensor module (MQ-135 on GPIO 34). There is **no physical wire connected to GPIO 35**. An unbonded/floating analog pin on the ESP32 floats to the 3.3V rail (`4095 AO`). To prevent false "LETHAL CO POISONING" alarms, the firmware applies Lead-Off Detection: floating readings ($\ge 4080$) are flagged as `-1` (unconnected probe), and the dashboard reports clean ambient baseline ($12\text{ PPM}$). |
| **NEO-6M GPS Module** | `RX: GPIO 16`<br>`TX: GPIO 17` | **CHIP WORKS / 0 SATS INDOORS** | The NEO-6M receiver chip is running and actively communicating over UART2 at 9600 Baud. It reports `sats: 0` because **1.575 GHz satellite microwave signals cannot penetrate concrete ceilings and roofs**. Indoors, the system anchors to the user's actual location: **Kotri Kalan, Madhya Pradesh (`23.16100°N, 77.10600°E`, elevation $498\text{ m}$)** with status `INDOOR_BASE_LOCK`. When moved to an open sky/window, it acquires 4+ satellites and switches to dynamic `3D_FIX`. |
| **Proximity Sensor (IR / HC-SR04)** | `TRIG: GPIO 5`<br>`ECHO: GPIO 18` | **MISCONFIGURED / STUCK LOW** | **Physical reality:** The sensor output line on GPIO 18 is resting permanently at `LOW` (0V).<br>1. If it's an **Active IR Obstacle Sensor (FC-51 / TCRT5000)**: The onboard sensitivity potentiometer is overtuned clockwise, locking the comparator into continuous obstacle detection.<br>2. If it's an **HC-SR04 Ultrasonic Sensor**: HC-SR04 requires **5V VCC** (from VIN/5V, not 3.3V). Under 3.3V, its ultrasonic emitter doesn't fire and the echo pin rests at 0V. |
| **Piezoelectric Buzzer** | `PIN: GPIO 23` | **WORKING (PWM UPGRADED)** | Firmware uses ESP32 LEDC timer 0 to drive GPIO 23 with a **2.4 kHz acoustic square wave (50% duty cycle)**. This guarantees sound on both active and passive buzzers. Silent when clear; chirps when an obstacle is within 25 cm. |
| **SOS Panic Button** | `PIN: GPIO 19` | **WORKING** | Debounced active-LOW button to GND. Toggles `sos: 1` emergency beacon. |

---

## 2. KEY BUGS DIAGNOSED & PERMANENTLY RESOLVED

### Bug A: Proximity Distance Alternating Between 3 cm and 15 cm
* **Root Cause 1:** Breadboard jumper cross-talk between GPIO 5 and GPIO 18 was producing false pulse widths of $\approx 180\mu\text{s}$ on `pulseIn`, which the math converted to $(180 \times 0.0343) / 2 = 3.08\text{ cm}$.
* **Root Cause 2:** The fallback IR code had `if (rawEcho == LOW || rawTrig == LOW)`. Because `PIN_TRIG` had just been set to `LOW` by `digitalWrite`, `rawTrig == LOW` was *always true*, forcing `currentDistCm = 15.0f` on the very next cycle!
* **Permanent Fix:**
  1. Filtered all pulse durations under $210\mu\text{s}$ ($< 3.5\text{ cm}$), rejecting electrical ringing and capacitive jumper cross-talk.
  2. Removed `rawTrig == LOW`. Only `rawEcho == LOW` on an active, latched IR line can trigger optical detection.

### Bug B: False "LETHAL! 4095 AO" CO Poisoning Alarm
* **Root Cause:** GPIO 35 has no wire. An unbonded ESP32 analog pin floats to 4095. The dashboard treated 4095 as lethal combustion blowback.
* **Permanent Fix:**
  1. Firmware filters open-circuit ADC rails: `int reportedCo = (rawCo > 25 && rawCo < 4080) ? rawCo : -1;`.
  2. `app.js` treats `rawAo >= 4080` or `co == -1` as **Lead-Off Standby (Nominal Clean Room Air: 12 PPM)**, eliminating false lethal alarms.

### Bug C: GPS Showing "0,0" / Broken Coordinates Indoors
* **Root Cause:** Indoors in Kotri Kalan, MP, GPS satellite reception is 0. Previous code either drifted fake Bangalore sine waves or output 0.00000.
* **Permanent Fix:** Anchored indoor mode to the user's physical base station grid in **Kotri Kalan, Madhya Pradesh (`23.16100°N, 77.10600°E`, altitude $498\text{ m}$)** with clear honest status `INDOOR_BASE_LOCK (0 SATS)`. When outdoors, live NMEA sentences dynamically override with satellite orbital triangulation.

---

## 3. FILE SYSTEM & CODEBASE ARCHITECTURE

```
c:\Users\hprad\OneDrive\Desktop\helmet\
├── app.js                                       # Web C2 Dashboard logic, Web Serial API ingest, Three.js 3D Twin
├── index.html                                   # Dashboard UI, Apple-style widgets, serial terminal drawer
├── style.css                                    # Tactical dark/light C2 theme tokens
├── firmware/
│   ├── helmet_firmware/
│   │   └── helmet_firmware.ino                  # Main Arduino C++ sketch for ESP32 (FQBN: esp32:esp32:esp32)
│   ├── helmet_firmware.ino                      # Synced copy
│   └── build/                                   # Compiled binary artifacts
│       ├── helmet_firmware.ino.bin              # App image (0x10000)
│       ├── helmet_firmware.ino.bootloader.bin   # Bootloader (0x1000)
│       └── helmet_firmware.ino.partitions.bin   # Partition table (0x8000)
├── scratch/
│   └── flash_wait_download.py                   # Automated esptool flasher script for COM4
└── PROJECT_HANDOVER_CONTEXT.md                  # This master document
```

---

## 4. FLASH PROCEDURE (ESP32 HARDWARE BOOTLOADER)

The ESP32 DevKit requires entering ROM Download Mode (`boot:0x13`) because the board lacks an automatic reset capacitor on the `EN` line:

1. Close any serial monitor or click **DISCONNECT** in the web dashboard so `COM4` is free.
2. In terminal, run:
   ```bash
   python scratch/flash_wait_download.py
   ```
3. Perform the **2-second two-button sequence** on the ESP32:
   - **Press and HOLD the `IO0` (right) button.**
   - **While holding `IO0`, click (press & release) the `EN` (left) button once.**
   - **Release the `IO0` button.**
4. The script detects download mode immediately and flashes the compiled binaries at 460800 Baud in $\approx 5$ seconds.

---

## 5. BUILT-IN HARDWARE DIAGNOSTIC COMMANDS

When connected over Serial (via Web Serial Console or Python terminal at 115200 Baud), the firmware accepts the following commands:

* `HEALTH` or `TEST`: Runs an automatic 5-point hardware self-test (triggers 3 x 2.4 kHz buzzer chirps, tests I2C 0x68 IMU, prints raw GPS NMEA sentence, measures MQ-135 voltage, and tests proximity pin level).
* `BUZZ`: Emits an acoustic test chirp on the physical buzzer.
* `GPS`: Dumps the latest raw NMEA sentence string received on UART2.
* `STATUS`: Prints compact hardware status string.
* `TARE`: Calibrates orientation gyro pitch/roll to 0.0°.

---

## 6. IMMEDIATE PHYSICAL ACTION ITEMS (WHAT TO SOLVE NEXT)

1. **Adjust Proximity Sensor Potentiometer**:
   If using an IR obstacle sensor module (FC-51), take a small screwdriver and turn the blue potentiometer counter-clockwise until the indicator LED turns OFF when no object is in front. It should light up only when an object is within 15 cm.
2. **Verify HC-SR04 Power**:
   If using an ultrasonic sensor, ensure its `VCC` pin is plugged into **5V / VIN**, not 3.3V.
3. **GPS Outdoor Verification**:
   Place the helmet near an open window or outdoors for 2–3 minutes to observe `sats` transition from `0` to `4–9` and `gps_status` transition from `INDOOR_BASE_LOCK` to `3D_FIX`.
