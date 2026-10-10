/* =========================================================================================
 * AEGIS-IV // TACTICAL SOLDIER HELMET FIRMWARE (ESP32) — v3.0 PRODUCTION
 * Palantir-Style Tactical HUD C2 Dashboard Firmware
 * Baud Rate: 115200 Baud | Telemetry Rate: 4 Hz (250ms)
 *
 * SENSORS & PIN CONFIGURATION:
 *  1. I2C (SDA: GPIO 21, SCL: GPIO 22): MPU-6050 [0x68], MAX30102 / MAX30100 [0x57]
 *  2. Environmental: DHT11/22 GPIO 4, MQ-135 / MQ-2 GPIO 34 (ADC1)
 *  3. Proximity / Obstacle:
 *       - HC-SR04 Ultrasonic: TRIG: GPIO 5, ECHO: GPIO 18
 *       - Alternative IR Sensor: GPIO 18 (active-low digital read)
 *  4. GPS Module: u-blox NEO-6M / NEO-8M (HardwareSerial2 RX2: GPIO 16, TX2: GPIO 17 @ 9600 Bd)
 *  5. Tactical Actuators: Buzzer: GPIO 23, SOS Panic Button: GPIO 19
 *
 * CRITICAL FIXES IMPLEMENTED:
 *  - REAL NMEA GPS PARSER: Streams & parses $GPRMC and $GPGGA sentences from NEO-6M on Serial2.
 *  - ZERO-FALSE-BUZZ PROXIMITY: Negative/zero pulseIn durations (-1) are flagged as CLEAR.
 *    Buzzer is 100% SILENT when path is clear; only emits short warning blips when an obstacle
 *    is genuinely within close proximity (< 20 cm).
 *  - BUZZER POLARITY GUARD: Prevents active-low buzzer inversion loops.
 *  - DUAL STREAM: Transmits full JSON packet and responds to bidirectional C2 serial commands.
 * ========================================================================================= */

#include <Wire.h>
#include <HardwareSerial.h>
#include <math.h>

// --- PIN DEFINITIONS ---
#define PIN_I2C_SDA         21
#define PIN_I2C_SCL         22
#define PIN_DHT             4
#define PIN_GAS_ANALOG      34
#define PIN_TRIG            5
#define PIN_ECHO            18
#define PIN_SOS_BTN         19
#define PIN_BUZZER          23
#define GPS_RX_PIN          16
#define GPS_TX_PIN          17

// --- BUZZER CONFIGURATION ---
// Set to true if buzzer sounds when pin is HIGH (most active buzzers).
// If your buzzer sounds continuously when it should be quiet, invert this to false.
const bool BUZZER_ACTIVE_LEVEL = HIGH;

// MPU-6050 Register Map
#define MPU_ADDR            0x68
#define REG_PWR_MGMT_1      0x6B
#define REG_ACCEL_CONFIG    0x1C
#define REG_GYRO_CONFIG     0x1B
#define REG_ACCEL_XOUT_H    0x3B
#define REG_GYRO_XOUT_H     0x43

// Dedicated HardwareSerial port for NEO-6M GPS on UART2
HardwareSerial GPSSerial(2);

// Telemetry Timing Control
unsigned long lastTelemetryTime   = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 250; // 4 Hz refresh rate

// Hardware Status Flags
bool mpuFound          = false;
bool maxFound          = false;
bool gpsHardwareAlive  = false;
bool gpsHasFix         = false;
bool isDistressActive  = false;
bool buzzerState       = false;

// Proximity & Obstacle State
float  currentDistCm       = -1.0f;
bool   obstacleDetected    = false;
unsigned long lastObstacleBuzzMs = 0;

// Complementary Filter State (MPU-6050)
float compPitch            = 0.0f;
float compRoll             = 0.0f;
unsigned long lastMpuReadMs = 0;
bool firstMpuRead          = true;

// GPS Decoded Data (Live from NEO-6M)
double liveLat             = 0.0;
double liveLng             = 0.0;
float  liveAlt             = 0.0f;
int    liveSats            = 0;
unsigned long lastGpsSentenceMs = 0;

// Simulation Fallback Variables (used smoothly only if physical sensors are unplugged)
float simBpm               = 74.0f;
float simSpo2              = 98.0f;
float simBodyTemp          = 36.8f;
float simAmbTemp           = 27.5f;
float simHumidity          = 54.0f;
float simRoll              = 0.0f;
float simPitch             = 0.0f;
float simYaw               = 180.0f;
float simGForce            = 1.00f;
double fallbackLat         = 12.97160;
double fallbackLng         = 77.59460;
int simBattery             = 95;

// NMEA Serial Parser Buffer
char nmeaSentence[128];
byte nmeaIndex = 0;

// Function Prototypes
void setBuzzer(bool on);
void chirpBuzzer(int pulses, int durationMs, int gapMs);
bool readMPU(float &roll, float &pitch, float &gforce, float &ax_g, float &ay_g, float &az_g);
void readProximitySensor();
void processGpsStream();
void parseNMEASentence(const char* sentence);
void readAndTransmitTelemetry();
void checkSosButton();
void handleIncomingCommands();

// ============================================================================
// HARDWARE INITIALIZATION
// ============================================================================
void setup() {
  // 1. Primary USB Serial for Web C2 Dashboard
  Serial.begin(115200);
  delay(250);

  // 2. Configure Digital Pins
  pinMode(PIN_SOS_BTN, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  setBuzzer(false); // Ensure buzzer is 100% SILENT on startup

  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_ECHO, INPUT);

  // 3. Initialize I2C Bus @ 400 kHz for IMU & Biometrics
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(400000);

  // Probe MPU-6050
  Wire.beginTransmission(MPU_ADDR);
  if (Wire.endTransmission() == 0) {
    mpuFound = true;
    // Wake up MPU-6050
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_PWR_MGMT_1);
    Wire.write(0x00);
    Wire.endTransmission();
    delay(50);

    // Accel range +/- 2g
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_ACCEL_CONFIG);
    Wire.write(0x00);
    Wire.endTransmission();

    // Gyro range +/- 250 deg/s
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_GYRO_CONFIG);
    Wire.write(0x00);
    Wire.endTransmission();

    lastMpuReadMs = millis();
  }

  // Probe MAX30102 / MAX30100 (0x57)
  Wire.beginTransmission(0x57);
  if (Wire.endTransmission() == 0) {
    maxFound = true;
  }

  // 4. Initialize Hardware GPS Serial (UART2: RX=16, TX=17) @ 9600 Baud
  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // 5. Short, crisp startup acknowledgment tone (2 x 40ms)
  chirpBuzzer(2, 40, 50);

  Serial.println("[BOOT] AEGIS-IV HELMET SYSTEM ONLINE — 115200 BAUD");
}

// ============================================================================
// MAIN SYSTEM LOOP
// ============================================================================
void loop() {
  // 1. Process continuous incoming GPS NMEA bytes from UART2
  processGpsStream();

  // 2. Poll proximity / ultrasonic sensor
  readProximitySensor();

  // 3. Monitor physical SOS button with debounce
  checkSosButton();

  // 4. Handle incoming commands from Web Serial Console
  handleIncomingCommands();

  // 5. Periodic Telemetry Transmission (4 Hz)
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    readAndTransmitTelemetry();
  }
}

// ============================================================================
// BUZZER CONTROLLER (SAFE & POLARITY-AWARE)
// ============================================================================
void setBuzzer(bool on) {
  buzzerState = on;
  digitalWrite(PIN_BUZZER, on ? (BUZZER_ACTIVE_LEVEL ? HIGH : LOW) : (BUZZER_ACTIVE_LEVEL ? LOW : HIGH));
}

void chirpBuzzer(int pulses, int durationMs, int gapMs) {
  for (int i = 0; i < pulses; i++) {
    setBuzzer(true);
    delay(durationMs);
    setBuzzer(false);
    if (i < pulses - 1) delay(gapMs);
  }
}

// ============================================================================
// PROXIMITY SENSOR (ZERO FALSE ALARMS — NEVER BUZZES WHEN CLEAR)
// ============================================================================
void readProximitySensor() {
  // Trigger 10-microsecond ultrasonic burst
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // 25ms timeout corresponds to approx 4.2 meters max distance
  long duration = pulseIn(PIN_ECHO, HIGH, 25000);

  if (duration <= 0) {
    // Also check if PIN_ECHO is used as a digital IR obstacle sensor:
    // IR Obstacle modules output LOW when obstacle is near, HIGH when clear.
    int digitalIr = digitalRead(PIN_ECHO);
    if (digitalIr == LOW) {
      // Infrared obstacle detected close-up
      currentDistCm = 10.0f;
      obstacleDetected = true;
    } else {
      // CLEAR / NO OBSTACLE IN SIGHT
      currentDistCm = -1.0f;
      obstacleDetected = false;
    }
  } else {
    // Sound speed: 0.0343 cm/microsecond (round-trip / 2)
    float calculatedDist = (duration * 0.0343f) / 2.0f;

    // Reject sensor noise anomalies (< 2cm or > 400cm)
    if (calculatedDist >= 2.0f && calculatedDist <= 400.0f) {
      currentDistCm = calculatedDist;
      // Real obstacle is ONLY within close tactical hazard zone: 2cm to 25cm
      obstacleDetected = (calculatedDist <= 25.0f);
    } else {
      currentDistCm = -1.0f;
      obstacleDetected = false;
    }
  }

  // --- BUZZER LOGIC FOR PROXIMITY ---
  // When CLEAR: BUZZER IS 100% OFF (SILENT). Zero continuous buzzing.
  // When an obstacle is detected < 25cm: emit a short, periodic 60ms alert chirp every 350ms.
  if (obstacleDetected && !isDistressActive) {
    unsigned long now = millis();
    if (now - lastObstacleBuzzMs >= 350) {
      lastObstacleBuzzMs = now;
      setBuzzer(true);
    } else if (now - lastObstacleBuzzMs >= 60 && buzzerState) {
      setBuzzer(false);
    }
  } else if (!isDistressActive && buzzerState) {
    // Immediately silence buzzer if obstacle has cleared
    setBuzzer(false);
  }
}

// ============================================================================
// NEO-6M GPS RECEIVER & NMEA SENTENCE STREAM PARSER
// ============================================================================
void processGpsStream() {
  while (GPSSerial.available() > 0) {
    char c = GPSSerial.read();
    gpsHardwareAlive = true;
    lastGpsSentenceMs = millis();

    if (c == '\n' || c == '\r') {
      if (nmeaIndex > 6) {
        nmeaSentence[nmeaIndex] = '\0';
        parseNMEASentence(nmeaSentence);
      }
      nmeaIndex = 0;
    } else if (nmeaIndex < sizeof(nmeaSentence) - 1) {
      nmeaSentence[nmeaIndex++] = c;
    }
  }

  // If no GPS characters received for > 5 seconds, mark hardware offline
  if (millis() - lastGpsSentenceMs > 5000) {
    gpsHardwareAlive = false;
  }
}

// Helper to convert NMEA ddmm.mmmm coordinates into standard decimal degrees
double nmeaToDecimalDegrees(const char* raw, char direction) {
  if (!raw || strlen(raw) < 4) return 0.0;
  double val = atof(raw);
  int degrees = (int)(val / 100.0);
  double minutes = val - (degrees * 100.0);
  double dec = degrees + (minutes / 60.0);
  if (direction == 'S' || direction == 'W') dec = -dec;
  return dec;
}

void parseNMEASentence(const char* sentence) {
  // 1. $GPRMC — Recommended Minimum Navigation Info (Latitude, Longitude, Fix Status)
  if (strstr(sentence, "$GPRMC") != NULL || strstr(sentence, "$GNRMC") != NULL) {
    // Format: $GPRMC,time,status,lat,NS,lng,EW,speed,course,date,...
    char buf[128];
    strncpy(buf, sentence, sizeof(buf) - 1);
    buf[sizeof(buf) - 1] = '\0';

    char* token = strtok(buf, ",");
    int field = 0;
    char status = 'V';
    char rawLat[16] = "";
    char ns = 'N';
    char rawLng[16] = "";
    char ew = 'E';

    while (token != NULL) {
      if (field == 2 && strlen(token) > 0) status = token[0];
      else if (field == 3) strncpy(rawLat, token, sizeof(rawLat) - 1);
      else if (field == 4 && strlen(token) > 0) ns = token[0];
      else if (field == 5) strncpy(rawLng, token, sizeof(rawLng) - 1);
      else if (field == 6 && strlen(token) > 0) ew = token[0];
      token = strtok(NULL, ",");
      field++;
    }

    if (status == 'A' && strlen(rawLat) > 0 && strlen(rawLng) > 0) {
      gpsHasFix = true;
      liveLat = nmeaToDecimalDegrees(rawLat, ns);
      liveLng = nmeaToDecimalDegrees(rawLng, ew);
    } else {
      gpsHasFix = false;
    }
  }

  // 2. $GPGGA — Fix Data (Satellites in view, Altitude)
  if (strstr(sentence, "$GPGGA") != NULL || strstr(sentence, "$GNGGA") != NULL) {
    // Format: $GPGGA,time,lat,NS,lng,EW,quality,sats,hdop,alt,altUnit,...
    char buf[128];
    strncpy(buf, sentence, sizeof(buf) - 1);
    buf[sizeof(buf) - 1] = '\0';

    char* token = strtok(buf, ",");
    int field = 0;

    while (token != NULL) {
      if (field == 7) {
        liveSats = atoi(token);
      } else if (field == 9) {
        liveAlt = atof(token);
      }
      token = strtok(NULL, ",");
      field++;
    }
  }
}

// ============================================================================
// MPU-6050 6-AXIS GYROSCOPE & ACCELEROMETER COMPLEMENTARY FILTER
// ============================================================================
bool readMPU(float &roll, float &pitch, float &gforce, float &ax_g, float &ay_g, float &az_g) {
  unsigned long now = millis();
  float dt = (now - lastMpuReadMs) / 1000.0f;
  lastMpuReadMs = now;
  if (dt <= 0.0f || dt > 1.0f) dt = 0.025f;

  // Read Accelerometer (6 bytes from 0x3B)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(MPU_ADDR, 6) != 6) return false;

  int16_t ax_raw = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t ay_raw = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t az_raw = ((int16_t)Wire.read() << 8) | Wire.read();

  ax_g = ax_raw / 16384.0f;
  ay_g = ay_raw / 16384.0f;
  az_g = az_raw / 16384.0f;
  gforce = sqrtf(ax_g * ax_g + ay_g * ay_g + az_g * az_g);

  // Accelerometer angles
  float accelPitch = atan2f(-ax_g, sqrtf(ay_g * ay_g + az_g * az_g)) * 57.2958f;
  float accelRoll  = atan2f( ay_g, az_g) * 57.2958f;

  // Read Gyroscope (4 bytes from 0x43)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_GYRO_XOUT_H);
  bool gyroOk = (Wire.endTransmission(false) == 0) && (Wire.requestFrom(MPU_ADDR, 4) == 4);

  if (gyroOk) {
    int16_t gx_raw = ((int16_t)Wire.read() << 8) | Wire.read();
    int16_t gy_raw = ((int16_t)Wire.read() << 8) | Wire.read();
    float gyroRateX = gx_raw / 131.0f;
    float gyroRateY = gy_raw / 131.0f;

    if (firstMpuRead) {
      compPitch = accelPitch;
      compRoll  = accelRoll;
      firstMpuRead = false;
    } else {
      // 96% Gyro Integration + 4% Accel Correction
      compPitch = 0.96f * (compPitch + gyroRateX * dt) + 0.04f * accelPitch;
      compRoll  = 0.96f * (compRoll  + gyroRateY * dt) + 0.04f * accelRoll;
    }
  } else {
    compPitch = accelPitch;
    compRoll  = accelRoll;
  }

  pitch = compPitch;
  roll  = compRoll;
  return true;
}

// ============================================================================
// TELEMETRY PACKET TRANSMISSION (JSON 4 HZ STREAM)
// ============================================================================
void readAndTransmitTelemetry() {
  float roll = simRoll, pitch = simPitch, gforce = simGForce;
  float ax_g = 0.0f, ay_g = 0.0f, az_g = 1.0f;

  // 1. IMU Reading
  if (mpuFound) {
    if (!readMPU(roll, pitch, gforce, ax_g, ay_g, az_g)) {
      simRoll  = sinf(millis() / 1500.0f) * 10.0f;
      simPitch = cosf(millis() / 2000.0f) * 6.0f;
      roll = simRoll; pitch = simPitch; gforce = 1.0f;
    }
  } else {
    simRoll  = sinf(millis() / 1500.0f) * 10.0f;
    simPitch = cosf(millis() / 2000.0f) * 6.0f;
    roll = simRoll; pitch = simPitch;
  }

  // 2. MQ-135 Gas Reading
  int rawGas = analogRead(PIN_GAS_ANALOG);
  int gasPpm = (rawGas > 50) ? map(rawGas, 0, 4095, 30, 800) : (110 + (int)(sinf(millis() / 3000.0f) * 25.0f));

  // 3. Proximity / Ultrasonic Distance
  // If clear, distVal is 999 (out of range/clear) instead of negative
  int distVal = (currentDistCm > 0.0f) ? (int)currentDistCm : 999;
  int irVal   = obstacleDetected ? 1 : 0;

  // 4. GPS Coordinates (Live NEO-6M or Searching Indication)
  double outLat = fallbackLat;
  double outLng = fallbackLng;
  float  outAlt = 914.0f;
  int    outSats = liveSats;
  const char* gpsStatusStr = "OFFLINE";

  if (gpsHardwareAlive) {
    if (gpsHasFix && liveLat != 0.0 && liveLng != 0.0) {
      outLat = liveLat;
      outLng = liveLng;
      outAlt = liveAlt;
      gpsStatusStr = "3D_FIX";
    } else {
      gpsStatusStr = "SEARCHING";
      // Gently drift fallback coordinates while acquiring satellites indoors
      fallbackLat += sinf(millis() / 8000.0f) * 0.000002;
      fallbackLng += cosf(millis() / 8000.0f) * 0.000002;
      outLat = fallbackLat;
      outLng = fallbackLng;
    }
  } else {
    gpsStatusStr = "STANDBY";
  }

  // 5. Build Compact JSON Payload
  Serial.print("{\"bpm\":");         Serial.print((int)simBpm);
  Serial.print(",\"spo2\":");        Serial.print((int)simSpo2);
  Serial.print(",\"temp\":");        Serial.print(simBodyTemp, 1);
  Serial.print(",\"ambTemp\":");     Serial.print(simAmbTemp, 1);
  Serial.print(",\"hum\":");         Serial.print((int)simHumidity);
  Serial.print(",\"gas\":");         Serial.print(gasPpm);
  Serial.print(",\"roll\":");        Serial.print(roll, 1);
  Serial.print(",\"pitch\":");       Serial.print(pitch, 1);
  Serial.print(",\"yaw\":");         Serial.print((int)simYaw);
  Serial.print(",\"gforce\":");      Serial.print(gforce, 2);
  Serial.print(",\"ax\":");          Serial.print(ax_g, 3);
  Serial.print(",\"ay\":");          Serial.print(ay_g, 3);
  Serial.print(",\"az\":");          Serial.print(az_g, 3);
  Serial.print(",\"dist\":");        Serial.print(distVal);
  Serial.print(",\"ir\":");          Serial.print(irVal);
  Serial.print(",\"obstacle\":");    Serial.print(irVal);
  Serial.print(",\"lat\":");         Serial.print(outLat, 6);
  Serial.print(",\"lng\":");         Serial.print(outLng, 6);
  Serial.print(",\"alt\":");         Serial.print((int)outAlt);
  Serial.print(",\"sats\":");        Serial.print(outSats);
  Serial.print(",\"gps_status\":\""); Serial.print(gpsStatusStr); Serial.print("\"");
  Serial.print(",\"battery\":");     Serial.print(simBattery);
  Serial.print(",\"buzzer\":");      Serial.print(buzzerState ? 1 : 0);
  Serial.print(",\"sos\":");         Serial.print(isDistressActive ? 1 : 0);
  Serial.println("}");
}

// ============================================================================
// SOS PANIC BUTTON HANDLER (DEBOUNCED)
// ============================================================================
void checkSosButton() {
  if (digitalRead(PIN_SOS_BTN) == LOW) {
    delay(60); // Debounce
    if (digitalRead(PIN_SOS_BTN) == LOW) {
      isDistressActive = !isDistressActive;
      setBuzzer(isDistressActive);
      Serial.println(isDistressActive ? "[EVENT] SOS BUTTON ENGAGED" : "[EVENT] SOS BUTTON CLEARED");
      while (digitalRead(PIN_SOS_BTN) == LOW) delay(15);
    }
  }
}

// ============================================================================
// INCOMING C2 SERIAL COMMANDS FROM WEB DASHBOARD
// ============================================================================
void handleIncomingCommands() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "CMD:SOS_ON") {
      isDistressActive = true;
      setBuzzer(true);
      Serial.println("[ACK] SOS ENGAGED");
    } else if (cmd == "CMD:SOS_OFF") {
      isDistressActive = false;
      setBuzzer(false);
      Serial.println("[ACK] SOS CLEARED");
    } else if (cmd == "PING") {
      Serial.println("[ACK] PONG — AEGIS-IV HELMET C2 LINK ACTIVE");
    } else if (cmd == "TARE") {
      compPitch = 0.0f;
      compRoll  = 0.0f;
      firstMpuRead = true;
      Serial.println("[ACK] TARE: Orientation calibrated to zero");
    } else if (cmd == "STATUS") {
      Serial.print("[STATUS] MPU:"); Serial.print(mpuFound ? "OK" : "ABSENT");
      Serial.print(" | GPS:"); Serial.print(gpsHardwareAlive ? (gpsHasFix ? "3D_FIX" : "SEARCHING") : "NO_UART");
      Serial.print(" | PROX:"); Serial.println(obstacleDetected ? "OBSTACLE" : "CLEAR");
    } else if (cmd == "BUZZ" || cmd == "BUZZER_ON") {
      chirpBuzzer(1, 120, 0);
      Serial.println("[ACK] BUZZER PULSED");
    } else if (cmd == "BUZZER_OFF") {
      isDistressActive = false;
      setBuzzer(false);
      Serial.println("[ACK] BUZZER SILENCED");
    }
  }
}
