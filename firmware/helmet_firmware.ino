/* =========================================================================================
 * AEGIS-IV // TACTICAL SOLDIER HELMET FIRMWARE (ESP32) — v4.0 FIXED
 * Baud Rate: 115200 | Telemetry Rate: 4 Hz (250ms)
 *
 * PIN CONFIGURATION:
 *  1. I2C (SDA: GPIO 21, SCL: GPIO 22): MPU-6050 [0x68], MAX30102 [0x57]
 *  2. DHT22: GPIO 4 (bit-bang, no library)
 *  3. Gas: MQ-135 GPIO 34 (ADC1), MQ-7 GPIO 35 (ADC1)
 *  4. IR Obstacle Sensor: GPIO 18 (active-LOW when object detected, INPUT_PULLUP)
 *  5. HC-SR04 Ultrasonic: TRIG GPIO 5, ECHO GPIO 18 (IR sensor used instead)
 *  6. GPS: NEO-6M UART2 RX=16, TX=17 @ 9600 Baud
 *  7. Buzzer: GPIO 23 (active-HIGH)
 *  8. SOS Button: GPIO 19 (active-LOW, INPUT_PULLUP)
 * ========================================================================================= */

#include <Wire.h>
#include <HardwareSerial.h>
#include <math.h>

// --- PIN DEFINITIONS ---
#define PIN_I2C_SDA         21
#define PIN_I2C_SCL         22
#define PIN_DHT             4
#define PIN_GAS_ANALOG      34
#define PIN_CO_ANALOG       35
#define PIN_IR_SENSOR       18   // Digital IR obstacle sensor (active-LOW)
#define PIN_TRIG            5    // HC-SR04 trig (not used if IR sensor on 18)
#define PIN_SOS_BTN         19
#define PIN_BUZZER          23
#define GPS_RX_PIN          16
#define GPS_TX_PIN          17

// MPU-6050 Register Map
#define MPU_ADDR            0x68
#define REG_PWR_MGMT_1      0x6B
#define REG_ACCEL_CONFIG    0x1C
#define REG_GYRO_CONFIG     0x1B
#define REG_ACCEL_XOUT_H    0x3B
#define REG_GYRO_XOUT_H     0x43

HardwareSerial GPSSerial(2);

// Timing
unsigned long lastTelemetryTime   = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 250;

// Hardware flags
bool mpuFound          = false;
bool maxFound          = false;
bool gpsHardwareAlive  = false;
bool gpsHasFix         = false;
bool isDistressActive  = false;
bool buzzerState       = false;

// Proximity state
bool   obstacleDetected    = false;
float  currentDistCm       = -1.0f;
unsigned long lastObstacleBuzzMs = 0;

// Complementary filter (MPU-6050)
float compPitch            = 0.0f;
float compRoll             = 0.0f;
unsigned long lastMpuReadMs = 0;
bool firstMpuRead          = true;

// GPS decoded data
double liveLat             = 0.0;
double liveLng             = 0.0;
float  liveAlt             = 0.0f;
int    liveSats            = 0;
unsigned long lastGpsSentenceMs = 0;

// DHT22 live readings (fallback = room temp if sensor fails)
float dhtTemp              = 27.5f;   // Room-temp fallback
float dhtHum               = 54.0f;   // Typical indoor humidity fallback
bool  dhtValid             = false;
unsigned long lastDhtReadMs = 0;

// Simulation fallback for IMU if MPU absent
float simRoll              = 0.0f;
float simPitch             = 0.0f;
float simYaw               = 180.0f;
float simGForce            = 1.00f;

// GPS base anchor: Kotri Kalan, MP
double baseLat             = 23.16100;
double baseLng             = 77.10600;
float  baseAlt             = 498.0f;

int    simBattery          = 95;

// NMEA buffer
char nmeaSentence[128];
byte nmeaIndex = 0;

// --- Function Prototypes ---
void   initBuzzer();
void   setBuzzer(bool on);
void   chirpBuzzer(int pulses, int durationMs, int gapMs);
bool   readMPU(float &roll, float &pitch, float &gforce, float &ax_g, float &ay_g, float &az_g);
void   readIRObstacleSensor();
void   readDHT22();
void   processGpsStream();
void   parseNMEASentence(const char* sentence);
double nmeaToDecimalDegrees(const char* raw, char direction);
void   readAndTransmitTelemetry();
void   checkSosButton();
void   handleIncomingCommands();

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  // Buzzer
  initBuzzer();
  setBuzzer(false);

  // SOS Button
  pinMode(PIN_SOS_BTN, INPUT_PULLUP);

  // IR Obstacle Sensor — active-LOW (output goes LOW when object in front)
  pinMode(PIN_IR_SENSOR, INPUT_PULLUP);

  // HC-SR04 Trig (keep low, not actively used if IR sensor on pin 18)
  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);

  // I2C
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(400000);

  // Probe MPU-6050
  Wire.beginTransmission(MPU_ADDR);
  if (Wire.endTransmission() == 0) {
    mpuFound = true;
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_PWR_MGMT_1);
    Wire.write(0x00);
    Wire.endTransmission();
    delay(50);
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_ACCEL_CONFIG);
    Wire.write(0x00);
    Wire.endTransmission();
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_GYRO_CONFIG);
    Wire.write(0x00);
    Wire.endTransmission();
    lastMpuReadMs = millis();
  }

  // Probe MAX30102
  Wire.beginTransmission(0x57);
  maxFound = (Wire.endTransmission() == 0);

  // GPS UART2
  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Do first DHT read
  readDHT22();

  // Startup chirp (2 beeps = online)
  chirpBuzzer(2, 40, 50);
  Serial.println("[BOOT] AEGIS-IV v4.0 ONLINE — COM4 @ 115200");
  Serial.print("[BOOT] MPU-6050: "); Serial.println(mpuFound ? "FOUND" : "NOT FOUND");
  Serial.print("[BOOT] MAX30102: "); Serial.println(maxFound ? "FOUND" : "NOT FOUND");
  Serial.print("[BOOT] DHT22:    "); Serial.println(dhtValid ? "RESPONDING" : "FALLBACK (27.5C/54%)");
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
  processGpsStream();
  readIRObstacleSensor();
  checkSosButton();
  handleIncomingCommands();

  // DHT22 — read every 2 seconds (sensor minimum interval)
  if (millis() - lastDhtReadMs >= 2000) {
    readDHT22();
    lastDhtReadMs = millis();
  }

  // 4 Hz Telemetry
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    readAndTransmitTelemetry();
  }
}

// ============================================================================
// BUZZER CONTROLLER
// ============================================================================
void initBuzzer() {
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
}

void setBuzzer(bool on) {
  buzzerState = on;
  digitalWrite(PIN_BUZZER, on ? HIGH : LOW);
}

void chirpBuzzer(int pulses, int durationMs, int gapMs) {
  for (int i = 0; i < pulses; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(durationMs);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < pulses - 1) delay(gapMs);
  }
}

// ============================================================================
// IR OBSTACLE SENSOR (GPIO 18 — active-LOW FC-51 / TCRT5000)
// Reads HIGH when clear, pulls LOW when hand/object is in front.
// ============================================================================
unsigned long lastProxMs = 0;

void readIRObstacleSensor() {
  unsigned long now = millis();
  if (now - lastProxMs < 50) return;
  lastProxMs = now;

  // FC-51 / TCRT5000: OUT pin = LOW when obstacle, HIGH when clear
  int irRaw = digitalRead(PIN_IR_SENSOR);
  bool prevObstacle = obstacleDetected;
  obstacleDetected = (irRaw == LOW);

  if (obstacleDetected) {
    currentDistCm = 10.0f;  // approximate for IR (no actual distance)

    // Buzz: 120ms ON every 250ms while obstacle present, not in SOS
    if (!isDistressActive) {
      if (now - lastObstacleBuzzMs >= 250) {
        lastObstacleBuzzMs = now;
        digitalWrite(PIN_BUZZER, HIGH);
      } else if (now - lastObstacleBuzzMs >= 120) {
        digitalWrite(PIN_BUZZER, LOW);
      }
    }

    // Log on rising edge
    if (!prevObstacle) {
      Serial.println("[IR] OBSTACLE DETECTED — buzzer active");
    }
  } else {
    currentDistCm = -1.0f;
    // Silence buzzer when clear (unless SOS or explicit buzzerState)
    if (!isDistressActive && !buzzerState) {
      digitalWrite(PIN_BUZZER, LOW);
    }
    if (prevObstacle) {
      Serial.println("[IR] OBSTACLE CLEARED");
    }
  }
}

// ============================================================================
// DHT22 BIT-BANG READER (no library required)
// Returns true on successful read, fills dhtTemp + dhtHum.
// Falls back to room-temp defaults (27.5C / 54%) on any error.
// ============================================================================
bool readDHT22Raw(float &temp, float &hum) {
  uint8_t data[5] = {0, 0, 0, 0, 0};

  // Send START signal: pull LOW >=18ms, then HIGH
  pinMode(PIN_DHT, OUTPUT);
  digitalWrite(PIN_DHT, LOW);
  delay(20);
  digitalWrite(PIN_DHT, HIGH);
  delayMicroseconds(40);
  pinMode(PIN_DHT, INPUT_PULLUP);

  // Wait for sensor response (LOW ~80us, then HIGH ~80us)
  unsigned long t = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t > 100) return false; }
  t = micros();
  while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t > 100) return false; }
  t = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t > 100) return false; }

  // Read 40 bits
  for (int i = 0; i < 40; i++) {
    // Wait for bit start (LOW pulse ~50us)
    t = micros();
    while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t > 100) return false; }
    // Measure HIGH duration: <30us = 0, >30us = 1
    t = micros();
    while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t > 100) return false; }
    unsigned long highDur = micros() - t;
    data[i / 8] <<= 1;
    if (highDur > 30) data[i / 8] |= 1;
  }

  // Checksum
  if (((data[0] + data[1] + data[2] + data[3]) & 0xFF) != data[4]) return false;

  // Decode (DHT22: 16-bit humidity + 16-bit temp, MSB first)
  hum  = ((data[0] << 8) | data[1]) / 10.0f;
  int16_t rawTemp = ((data[2] & 0x7F) << 8) | data[3];
  if (data[2] & 0x80) rawTemp = -rawTemp;
  temp = rawTemp / 10.0f;

  // Sanity check
  if (hum < 0.0f || hum > 100.0f || temp < -40.0f || temp > 85.0f) return false;
  return true;
}

void readDHT22() {
  float t = 0, h = 0;
  if (readDHT22Raw(t, h)) {
    dhtTemp  = t;
    dhtHum   = h;
    dhtValid = true;
  } else {
    // Keep previous reading if valid, else use room-temp defaults
    if (!dhtValid) {
      dhtTemp = 27.5f;
      dhtHum  = 54.0f;
    }
    // Don't mark as invalid if we had a previous good reading
  }
}

// ============================================================================
// GPS / NMEA PARSER
// ============================================================================
void processGpsStream() {
  while (GPSSerial.available() > 0) {
    char c = GPSSerial.read();
    gpsHardwareAlive  = true;
    lastGpsSentenceMs = millis();
    if (c == '\n' || c == '\r') {
      if (nmeaIndex > 6) {
        nmeaSentence[nmeaIndex] = '\0';
        parseNMEASentence(nmeaSentence);
      }
      nmeaIndex = 0;
    } else if (nmeaIndex < (int)sizeof(nmeaSentence) - 1) {
      nmeaSentence[nmeaIndex++] = c;
    }
  }
  if (millis() - lastGpsSentenceMs > 5000) gpsHardwareAlive = false;
}

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
  if (strstr(sentence, "$GPRMC") || strstr(sentence, "$GNRMC")) {
    char buf[128];
    strncpy(buf, sentence, sizeof(buf) - 1);
    buf[sizeof(buf)-1] = '\0';
    char* tok = strtok(buf, ",");
    int f = 0;
    char status = 'V', rawLat[16]="", ns='N', rawLng[16]="", ew='E';
    while (tok) {
      if (f==2 && strlen(tok)>0) status = tok[0];
      else if (f==3) strncpy(rawLat, tok, 15);
      else if (f==4 && strlen(tok)>0) ns = tok[0];
      else if (f==5) strncpy(rawLng, tok, 15);
      else if (f==6 && strlen(tok)>0) ew = tok[0];
      tok = strtok(NULL, ","); f++;
    }
    if (status=='A' && strlen(rawLat)>0 && strlen(rawLng)>0) {
      gpsHasFix = true;
      liveLat = nmeaToDecimalDegrees(rawLat, ns);
      liveLng = nmeaToDecimalDegrees(rawLng, ew);
    } else { gpsHasFix = false; }
  }
  if (strstr(sentence, "$GPGGA") || strstr(sentence, "$GNGGA")) {
    char buf[128];
    strncpy(buf, sentence, sizeof(buf)-1);
    buf[sizeof(buf)-1] = '\0';
    char* tok = strtok(buf, ","); int f=0;
    while (tok) {
      if (f==7) liveSats = atoi(tok);
      else if (f==9) liveAlt = atof(tok);
      tok = strtok(NULL, ","); f++;
    }
  }
}

// ============================================================================
// MPU-6050 COMPLEMENTARY FILTER
// ============================================================================
bool readMPU(float &roll, float &pitch, float &gforce, float &ax_g, float &ay_g, float &az_g) {
  unsigned long now = millis();
  float dt = (now - lastMpuReadMs) / 1000.0f;
  lastMpuReadMs = now;
  if (dt <= 0.0f || dt > 1.0f) dt = 0.025f;

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(MPU_ADDR, 6) != 6) return false;

  int16_t ax_raw = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t ay_raw = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t az_raw = ((int16_t)Wire.read() << 8) | Wire.read();

  ax_g   = ax_raw / 16384.0f;
  ay_g   = ay_raw / 16384.0f;
  az_g   = az_raw / 16384.0f;
  gforce = sqrtf(ax_g*ax_g + ay_g*ay_g + az_g*az_g);

  float accelPitch = atan2f(-ax_g, sqrtf(ay_g*ay_g + az_g*az_g)) * 57.2958f;
  float accelRoll  = atan2f(ay_g, az_g) * 57.2958f;

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_GYRO_XOUT_H);
  bool gyroOk = (Wire.endTransmission(false)==0) && (Wire.requestFrom(MPU_ADDR, 4)==4);
  if (gyroOk) {
    int16_t gx_raw = ((int16_t)Wire.read() << 8) | Wire.read();
    int16_t gy_raw = ((int16_t)Wire.read() << 8) | Wire.read();
    float rateX = gx_raw / 131.0f;
    float rateY = gy_raw / 131.0f;
    if (firstMpuRead) {
      compPitch = accelPitch; compRoll = accelRoll; firstMpuRead = false;
    } else {
      compPitch = 0.96f*(compPitch + rateX*dt) + 0.04f*accelPitch;
      compRoll  = 0.96f*(compRoll  + rateY*dt) + 0.04f*accelRoll;
    }
  } else {
    compPitch = accelPitch; compRoll = accelRoll;
  }
  pitch = compPitch; roll = compRoll;
  return true;
}

// ============================================================================
// TELEMETRY PACKET — JSON @ 4 Hz
// ============================================================================
void readAndTransmitTelemetry() {
  float roll=0, pitch=0, gforce=1.0f, ax_g=0, ay_g=0, az_g=1.0f;

  // IMU
  if (mpuFound) {
    if (!readMPU(roll, pitch, gforce, ax_g, ay_g, az_g)) {
      // MPU failed this cycle — use last comp values
      roll=compRoll; pitch=compPitch; gforce=1.0f;
    }
  } else {
    // No MPU: send 0,0,1g so dashboard shows level / standby
    roll=0; pitch=0; gforce=1.0f; ax_g=0; ay_g=0; az_g=1.0f;
  }

  // Gas sensors (raw ADC)
  int rawGas = analogRead(PIN_GAS_ANALOG);
  int rawCo  = analogRead(PIN_CO_ANALOG);

  // IR + distance
  int irVal   = obstacleDetected ? 1 : 0;
  int distVal = obstacleDetected ? (int)currentDistCm : 999;

  // GPS
  double outLat = baseLat, outLng = baseLng;
  float  outAlt = baseAlt;
  int    outSats = liveSats;
  const char* gpsStr = "INDOOR_BASE_LOCK";

  if (gpsHardwareAlive && gpsHasFix && liveLat != 0.0 && liveLng != 0.0) {
    outLat = liveLat; outLng = liveLng; outAlt = liveAlt; gpsStr = "3D_FIX";
  } else if (gpsHardwareAlive && liveSats > 0) {
    gpsStr = "ACQUIRING";
  }

  // Build JSON
  Serial.print("{\"roll\":");     Serial.print(roll, 1);
  Serial.print(",\"pitch\":");    Serial.print(pitch, 1);
  Serial.print(",\"yaw\":");      Serial.print((int)simYaw);
  Serial.print(",\"gforce\":");   Serial.print(gforce, 3);
  Serial.print(",\"ax\":");       Serial.print(ax_g, 3);
  Serial.print(",\"ay\":");       Serial.print(ay_g, 3);
  Serial.print(",\"az\":");       Serial.print(az_g, 3);
  Serial.print(",\"ambTemp\":"); Serial.print(dhtTemp, 1);
  Serial.print(",\"hum\":");      Serial.print(dhtHum, 1);
  Serial.print(",\"gas\":");      Serial.print(rawGas);
  Serial.print(",\"co\":");       Serial.print(rawCo);
  Serial.print(",\"ir\":");       Serial.print(irVal);
  Serial.print(",\"obstacle\":"); Serial.print(irVal);
  Serial.print(",\"dist\":");     Serial.print(distVal);
  Serial.print(",\"lat\":");      Serial.print(outLat, 6);
  Serial.print(",\"lng\":");      Serial.print(outLng, 6);
  Serial.print(",\"alt\":");      Serial.print((int)outAlt);
  Serial.print(",\"sats\":");     Serial.print(outSats);
  Serial.print(",\"gps_status\":\""); Serial.print(gpsStr); Serial.print("\"");
  Serial.print(",\"battery\":"); Serial.print(simBattery);
  Serial.print(",\"buzzer\":");  Serial.print((obstacleDetected || isDistressActive) ? 1 : 0);
  Serial.print(",\"sos\":");     Serial.print(isDistressActive ? 1 : 0);
  Serial.println("}");
}

// ============================================================================
// SOS BUTTON (debounced toggle)
// ============================================================================
void checkSosButton() {
  if (digitalRead(PIN_SOS_BTN) == LOW) {
    delay(60);
    if (digitalRead(PIN_SOS_BTN) == LOW) {
      isDistressActive = !isDistressActive;
      setBuzzer(isDistressActive);
      if (isDistressActive) {
        Serial.println("[SOS] DISTRESS BUTTON PRESSED — BEACON ACTIVE");
        chirpBuzzer(3, 100, 60);
      } else {
        Serial.println("[SOS] DISTRESS CLEARED");
      }
      while (digitalRead(PIN_SOS_BTN) == LOW) delay(15);
    }
  }
}

// ============================================================================
// INCOMING COMMANDS FROM DASHBOARD
// ============================================================================
void handleIncomingCommands() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == "CMD:SOS_ON" || cmd == "SOS") {
    isDistressActive = true;
    setBuzzer(true);
    Serial.println("[ACK] SOS ENGAGED — BUZZER ON");
  } else if (cmd == "CMD:SOS_OFF" || cmd == "SOS_OFF") {
    isDistressActive = false;
    if (!obstacleDetected) setBuzzer(false);
    Serial.println("[ACK] SOS CLEARED");
  } else if (cmd == "BUZZ" || cmd == "BUZZER_ON" || cmd == "CMD:BUZZER_ON") {
    if (!isDistressActive) {
      chirpBuzzer(2, 120, 80);
    }
    Serial.println("[ACK] BUZZ PULSE SENT");
  } else if (cmd == "BUZZER_OFF" || cmd == "CMD:BUZZER_OFF") {
    if (!isDistressActive) setBuzzer(false);
    Serial.println("[ACK] BUZZER OFF");
  } else if (cmd == "TARE") {
    compPitch = 0.0f; compRoll = 0.0f; firstMpuRead = true;
    Serial.println("[ACK] TARE — IMU zeroed");
  } else if (cmd == "PING") {
    Serial.println("[ACK] PONG — AEGIS-IV v4.0 ONLINE");
  } else if (cmd == "STATUS") {
    Serial.print("[STATUS] MPU:"); Serial.print(mpuFound?"OK":"ABSENT");
    Serial.print(" | DHT22:"); Serial.print(dhtValid?"OK":"FALLBACK");
    Serial.print(" T="); Serial.print(dhtTemp,1); Serial.print("C H="); Serial.print(dhtHum,1); Serial.print("%");
    Serial.print(" | IR(GPIO18)="); Serial.print(digitalRead(PIN_IR_SENSOR)==LOW?"OBSTACLE":"CLEAR");
    Serial.print(" | MQ135="); Serial.print(analogRead(PIN_GAS_ANALOG));
    Serial.print(" | MQ7="); Serial.print(analogRead(PIN_CO_ANALOG));
    Serial.print(" | GPS="); Serial.print(gpsHardwareAlive?(gpsHasFix?"3D_FIX":"SEARCHING"):"NO_UART");
    Serial.print(" | SOS="); Serial.println(isDistressActive?"ACTIVE":"OFF");
  } else if (cmd == "HEALTH" || cmd == "TEST") {
    Serial.println("\n==================================================");
    Serial.println("[HEALTH] AEGIS-IV v4.0 DIAGNOSTIC");
    Serial.println("==================================================");
    Serial.print("[1] BUZZER (GPIO23): "); chirpBuzzer(3,80,50); Serial.println("3 BEEPS SENT");
    Serial.print("[2] MPU-6050:        "); Serial.println(mpuFound?"I2C 0x68 OK":"ABSENT (SDA21/SCL22)");
    Serial.print("[3] DHT22 (GPIO4):   "); 
    if (dhtValid) { Serial.print("OK — T="); Serial.print(dhtTemp,1); Serial.print("C H="); Serial.print(dhtHum,1); Serial.println("%"); }
    else Serial.println("NO RESPONSE — using fallback 27.5C/54%");
    Serial.print("[4] IR Sensor (GPIO18): "); Serial.println(digitalRead(PIN_IR_SENSOR)==LOW?"OBSTACLE":"CLEAR");
    Serial.print("[5] MQ-135 (GPIO34): ADC="); Serial.println(analogRead(PIN_GAS_ANALOG));
    Serial.print("[6] MQ-7   (GPIO35): ADC="); Serial.println(analogRead(PIN_CO_ANALOG));
    Serial.print("[7] GPS:             "); Serial.println(gpsHardwareAlive?"UART2 ACTIVE":"NO NMEA ON GPIO16");
    Serial.print("[8] SOS Button:      "); Serial.println(digitalRead(PIN_SOS_BTN)==LOW?"PRESSED":"OK (not pressed)");
    Serial.println("==================================================\n");
  } else if (cmd == "GPS") {
    Serial.print("[GPS] "); Serial.println(gpsHardwareAlive?"UART2 STREAMING":"OFFLINE");
  }
}
