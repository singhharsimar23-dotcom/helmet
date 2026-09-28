# SMART SOLDIER HELMET // TELEMETRY C2 PLAYGROUND

> High-precision tactical command & control telemetry platform for the ESP32 Smart Combat Helmet. Features a 3D digital twin of the Ops-Core FAST ballistic helmet with an authentic aircraft-grade flight HUD level meter, interactive floating sensor widgets with expandable depth drawers, and real-time Web Serial USB hardware ingestion.

---

## ⚡ Live Telemetry Playground
- **Local Development Server**: [http://localhost:8080](http://localhost:8080)
- **Deployment Platform**: Vercel Static Edge
- **Target Repository**: `https://github.com/singhharsimar23-dotcom/helmet`

---

## 🛡️ Core Capabilities

### 1. Interactive 3D Digital Twin & Aircraft HUD
- **Ops-Core FAST Helmet**: High-fidelity 3D model featuring Desert Tan (FDE) Kevlar geometry, Wilcox 3-hole skeleton NVG shroud, Indian Armed Forces tri-service crest, high-cut ARC rails, 4-point dial retention system, and full oval chin cup.
- **Aircraft-Grade Fighter HUD Level Meter**:
  - **Dynamic Pitch Ladder**: Degree rungs from `+30°` to `-30°` with an artificial horizon line (`════ HORIZON ════`) that translates vertically and rotates with soldier attitude.
  - **Bank Angle Arc**: Curved top roll arc with dynamic roll pointer triangle tracking soldier head tilt.
  - **Boresight Reticle**: Center crosshair with horizontal index lines for optical sight alignment.
  - **Attitude & G-Force Dock**: Instantaneous telemetry readouts for Roll, Pitch, Yaw, and total G-load vector.
- **Camera Zoom & Orbit Controls**:
  - Mouse scroll wheel zoom in / zoom out with smooth clamping.
  - On-screen tactile HUD buttons (`[+]`, `[-]`, `[⟲]` perspective reset, `[360°]` inspection spin).
  - Left-click drag for full 3-axis orbital inspection.

### 2. Floating Interactive Widget System (Clutter-Free Depth)
- **Zero Clutter Architecture**: Each sensor displays in a sleek, compact summary card showing sensor identifier, domain heading, live metric, and operational status pill.
- **Expandable Depth Drawers**: Clicking any card or its chevron arrow (`▼`) smoothly slides down an accordion drawer detailing:
  - Technical sensor function and physiological relevance.
  - Dynamic visual threshold progress bar with safe / elevated / lethal zones.
  - Applicable defense & occupational standards (MIL-STD-1472H, NIOSH REL, OSHA PEL, US Army TB MED 507, MIL-STD-662F).
  - Autonomous tactical remediation protocols.
  - Command actuators (e.g. Airflow Purge, Evacuation Tone, Anti-Fog Blower Pulse, TBI Black-Box Logger).
- **Hazard Auto-Trip**: When any sensor breaches military safety thresholds, the widget automatically transitions into an animated glowing red danger state, alerts the operator with an acoustic siren, and auto-expands the drawer to present immediate remediation directives.

### 3. Strict Zero Hardcoded Values
- When disconnected from hardware, all numerals display clean standby dashes (`—`) and status badges read `STANDBY`.
- No mock data or fake numbers are ever hardcoded in the interface. Values only populate upon:
  1. Connecting directly via USB using the **Web Serial API** at 115200 Baud.
  2. Activating the field **Test Harness** for automated validation.

---

## 🔌 Hardware Sensor Matrix & ESP32 Pinout

| Sensor Subsystem | Model | Interface | ESP32 Pin | Purpose | Safe Baseline | Critical Threshold |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **6-DoF Inertial Guidance** | MPU-6050 | I2C (0x68) | SDA: `GPIO 21`<br>SCL: `GPIO 22` | Head roll/pitch kinematics & blast impact | Routine: `< 2.5 G` | Concussion: `> 4.5 G`<br>Severe TBI: `> 8.0 G` |
| **Toxic Gases / CBRN** | MQ-135 | Analog + Digital | AO: `GPIO 34`<br>DO: `GPIO 25` | Airborne VOCs, ammonia, benzene, smoke | `< 800 AO` (< 1000 ppm) | Elevated: `800–1400 AO`<br>Toxic Trip: `> 1400 AO` |
| **Carbon Monoxide (CO)** | MQ-7 | Analog + Digital | AO: `GPIO 35`<br>DO: `GPIO 26` | Blast combustion blowback, vehicle exhaust | `< 400 AO` (< 35 ppm) | OSHA PEL: `> 400 AO`<br>NIOSH IDLH: `> 900 AO` |
| **Visor Micro-Climate** | DHT22 | 1-Wire Digital | Data: `GPIO 4` | Heat stress & optical visor condensation | 18°C – 32°C<br>RH: `< 70%` | Heat Stroke: `> 38°C`<br>Fogging Risk: `> 75%` |
| **Face Shield Latch** | IR Sensor | Digital | DO: `GPIO 27` | Visor airtight lock & proximity defense | Visor Sealed | Visor Unlatched / Breach |
| **Acoustic Actuator** | Piezo Buzzer | PWM | PWM: `GPIO 14` | Tactical warnings & consciousness ping | Standby | 2.4 kHz Alert Strobe |
| **Satellite Positioning** | NEO-6M GPS | UART | RX: `GPIO 16`<br>TX: `GPIO 17` | Tactical grid coordinates & distress beacon | 3D Fix | Signal Lost / Jammed |

---

## 📡 Serial Telemetry Ingestion Protocol (115200 Baud)

The dashboard ingests telemetry packets emitted by the ESP32 microcontroller in standard newline-delimited JSON or comma-separated key-value pairs:

```json
{
  "ax": 0.05,
  "ay": 0.12,
  "az": 0.98,
  "roll": 14.2,
  "pitch": -6.5,
  "yaw": 182.0,
  "gforce": 1.02,
  "temp": 28.4,
  "humidity": 52.0,
  "mq135": 480,
  "mq7": 210,
  "ir": 1,
  "gps": "34.0522 N, 74.8212 E"
}
```

---

## 🚀 Deployment Instructions

### Deploy to Vercel
```bash
# Non-interactive production deployment
npx vercel --prod --yes
```

### Git Version Control
```bash
git init
git add .
git commit -m "feat: smart soldier helmet telemetry c2 playground"
git remote add origin https://github.com/singhharsimar23-dotcom/helmet.git
git push -u origin main --force
```

---

## 📜 Compliance Standards
- **MIL-STD-1472H**: Department of Defense Human Engineering Design Standards.
- **US Army TB MED 507**: Prevention, Treatment and Control of Heat Injury.
- **MIL-STD-662F**: V50 Ballistic Test for Armor.
- **NIOSH REL / OSHA PEL**: Occupational Standards for Toxic Gas and Carbon Monoxide Inhalation.
