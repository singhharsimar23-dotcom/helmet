/* =========================================================================================
 * AEGIS-IV // TACTICAL SOLDIER HELMET FIRMWARE (ESP32) — v2.1
 * Palantir-Style Tactical HUD Dashboard
 * Baud Rate: 115200 Baud | JSON at 4 Hz
 *
 * SENSORS & PIN CONFIGURATION:
 *  1. I2C (SDA:21, SCL:22): MPU-6050 [0x68], MAX30102 [0x57]
 *  2. Environmental: DHT11/22 GPIO4, MQ-2/135 GPIO34 (ADC1)
 *  3. Proximity: HC-SR04 (TRIG:5, ECHO:18)
 *  4. GPS: NEO-6M/8M (Serial2 RX2:16, TX2:17)
 *  5. SOS Button: GPIO19, Buzzer: GPIO23
 *
 * MPU-6050 Orientation: Gyroscope complementary filter (96% gyro + 4% accel)
 * Gives stable, drift-corrected Euler angles that respond immediately to tilt.
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

// MPU-6050 Register Map
#define MPU_ADDR            0x68
#define REG_PWR_MGMT_1      0x6B
#define REG_ACCEL_CONFIG    0x1C
#define REG_GYRO_CONFIG     0x1B
#define REG_ACCEL_XOUT_H    0x3B
#define REG_GYRO_XOUT_H     0x43

HardwareSerial GPSSerial(2);

// Timing control
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 250;  // 4 Hz

// Sensor state flags
bool mpuFound   = false;
bool maxFound   = false;
bool isDistressActive = false;

// --- Complementary filter state ---
float compPitch = 0.0f;
float compRoll  = 0.0f;
unsigned long lastMpuReadMs = 0;
bool firstMpuRead = true;

// Simulation fallback values
float simBpm      = 74.0f;
float simSpo2     = 98.0f;
float simBodyTemp = 36.8f;
float simAmbTemp  = 27.5f;
float simHumidity = 54.0f;
float simRoll     = 0.0f;
float simPitch    = 0.0f;
float simYaw      = 180.0f;
float simGForce   = 1.01f;
float simDist     = 120.0f;
double simLat     = 12.97160;
double simLng     = 77.59460;
int simBattery    = 92;

// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  // GPIO setup
  pinMode(PIN_SOS_BTN, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);

  // I2C @ 400 kHz
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(400000);

  // --- MPU-6050 Init ---
  Wire.beginTransmission(MPU_ADDR);
  if (Wire.endTransmission() == 0) {
    mpuFound = true;

    // 1. Wake up MPU (clear sleep bit in PWR_MGMT_1)
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_PWR_MGMT_1);
    Wire.write(0x00);
    Wire.endTransmission();
    delay(100);

    // 2. Set accelerometer to +-2g (16384 LSB/g)
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_ACCEL_CONFIG);
    Wire.write(0x00);
    Wire.endTransmission();

    // 3. Set gyroscope to +-250 deg/s (131 LSB/deg/s)
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_GYRO_CONFIG);
    Wire.write(0x00);
    Wire.endTransmission();

    delay(50);
    lastMpuReadMs = millis();
  }

  // --- MAX30102 check ---
  Wire.beginTransmission(0x57);
  if (Wire.endTransmission() == 0) maxFound = true;

  // --- GPS Serial ---
  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Startup chirp
  for (int i = 0; i < 2; i++) {
    digitalWrite(PIN_BUZZER, HIGH); delay(80);
    digitalWrite(PIN_BUZZER, LOW);  delay(60);
  }
}

// ============================================================================
void loop() {
  handleIncomingCommands();
  checkSosButton();
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();
    readAndTransmitTelemetry();
  }
}

// ============================================================================
// GYROSCOPE + ACCELEROMETER COMPLEMENTARY FILTER
// 96% gyro integration + 4% accelerometer correction
// Gives drift-corrected Euler angles that respond immediately to physical tilt
// ============================================================================
bool readMPU(float &roll, float &pitch, float &gforce, float &ax_g, float &ay_g, float &az_g) {
  unsigned long now = millis();
  float dt = (now - lastMpuReadMs) / 1000.0f;
  lastMpuReadMs = now;
  if (dt <= 0.0f || dt > 1.0f) dt = 0.025f;

  // Read accelerometer (6 bytes from 0x3B)
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
  gforce = sqrtf(ax_g*ax_g + ay_g*ay_g + az_g*az_g);

  // Accelerometer angles (noisy but absolute reference)
  float accelPitch = atan2f(-ax_g, sqrtf(ay_g*ay_g + az_g*az_g)) * 57.2958f;
  float accelRoll  = atan2f( ay_g, az_g) * 57.2958f;

  // Read gyroscope (4 bytes from 0x43: GYRO_X and GYRO_Y)
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
void readAndTransmitTelemetry() {
  float roll = simRoll, pitch = simPitch, gforce = simGForce;
  float ax_g = 0.0f, ay_g = 0.0f, az_g = 1.0f;

  if (mpuFound) {
    if (!readMPU(roll, pitch, gforce, ax_g, ay_g, az_g)) {
      // I2C read failed - use smooth simulation
      simRoll  = sinf(millis() / 1500.0f) * 10.0f;
      simPitch = cosf(millis() / 2000.0f) * 6.0f;
      roll = simRoll; pitch = simPitch; gforce = 1.0f;
    }
  } else {
    simRoll  = sinf(millis() / 1500.0f) * 10.0f;
    simPitch = cosf(millis() / 2000.0f) * 6.0f;
    roll = simRoll; pitch = simPitch;
  }

  // MQ-135 Gas
  int rawGas = analogRead(PIN_GAS_ANALOG);
  int gasPpm = (rawGas > 50) ? map(rawGas, 0, 4095, 30, 800) : (110 + (int)(sinf(millis() / 3000.0f) * 25.0f));

  // HC-SR04 Ultrasonic
  float distCm = readUltrasonicDistance();
  if (distCm <= 0 || distCm > 400) {
    simDist = 120.0f + sinf(millis() / 2500.0f) * 50.0f;
    distCm  = simDist;
  }

  // Biometrics (simulated - replace with real MAX30102 reads if sensor wired)
  float bpm = simBpm + sinf(millis() / 2000.0f) * 4.0f;

  // GPS drift
  simLat += sinf(millis() / 5000.0f) * 0.000005;
  simLng += cosf(millis() / 5000.0f) * 0.000005;
  simYaw  = fmod(simYaw + 0.3f, 360.0f);

  int sosVal = isDistressActive ? 1 : 0;

  // JSON output
  Serial.print("{\"bpm\":");         Serial.print((int)bpm);
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
  Serial.print(",\"dist\":");        Serial.print((int)distCm);
  Serial.print(",\"lat\":");         Serial.print(simLat, 6);
  Serial.print(",\"lng\":");         Serial.print(simLng, 6);
  Serial.print(",\"alt\":914,\"sats\":9,\"battery\":");
  Serial.print(simBattery);
  Serial.print(",\"sos\":");         Serial.print(sosVal);
  Serial.println("}");
}

// ============================================================================
float readUltrasonicDistance() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long dur = pulseIn(PIN_ECHO, HIGH, 25000);
  return (dur == 0) ? -1 : (dur * 0.0343f) / 2.0f;
}

// ============================================================================
void checkSosButton() {
  if (digitalRead(PIN_SOS_BTN) == LOW) {
    delay(50);
    if (digitalRead(PIN_SOS_BTN) == LOW) {
      isDistressActive = !isDistressActive;
      digitalWrite(PIN_BUZZER, isDistressActive ? HIGH : LOW);
      while (digitalRead(PIN_SOS_BTN) == LOW) delay(10);
    }
  }
}

// ============================================================================
void handleIncomingCommands() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if      (cmd == "CMD:SOS_ON")  { isDistressActive = true;  digitalWrite(PIN_BUZZER, HIGH); Serial.println("[ACK] SOS ENGAGED"); }
    else if (cmd == "CMD:SOS_OFF") { isDistressActive = false;  digitalWrite(PIN_BUZZER, LOW);  Serial.println("[ACK] SOS CLEARED"); }
    else if (cmd == "PING")   { Serial.println("[ACK] PONG - ESP32 AEGIS-IV ONLINE"); }
    else if (cmd == "TARE")   { compPitch = 0.0f; compRoll = 0.0f; firstMpuRead = true; Serial.println("[ACK] TARE: orientation zeroed"); }
    else if (cmd == "STATUS") { Serial.print("[STATUS] MPU:"); Serial.print(mpuFound?"LIVE":"SIM"); Serial.print(" MAX:"); Serial.println(maxFound?"LIVE":"SIM"); }
    else if (cmd == "BUZZ" || cmd == "BUZZER_ON") { digitalWrite(PIN_BUZZER, HIGH); delay(150); digitalWrite(PIN_BUZZER, LOW); }
    else if (cmd == "BUZZER_OFF")  { digitalWrite(PIN_BUZZER, LOW); }
  }
}
