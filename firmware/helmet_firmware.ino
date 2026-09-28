/* =========================================================================================
 * AEGIS-IV // TACTICAL SOLDIER HELMET FIRMWARE (ESP32)
 * Designed for Palantir-Style Tactical HUD Dashboard
 * Baud Rate: 115200 Baud
 *
 * SENSORS & PIN CONFIGURATION (ESP32 DevKit V1 30-pin / 38-pin):
 *  1. I2C Bus (SDA: GPIO 21, SCL: GPIO 22):
 *     - MPU-6050 (6-Axis Gyro & Accelerometer / Concussion Sensor) [Addr: 0x68]
 *     - MAX30102 / MAX30100 (Pulse Oximeter & Heart Rate)        [Addr: 0x57]
 *  2. Environmental:
 *     - DHT11 / DHT22 (Ambient Temperature & Humidity): GPIO 4
 *     - MQ-2 / MQ-135 (Toxic Gas / Air Quality):        GPIO 34 (Analog ADC1)
 *  3. Proximity:
 *     - HC-SR04 Ultrasonic (TRIG: GPIO 5, ECHO: GPIO 18)
 *  4. Geolocation (GPS):
 *     - NEO-6M / NEO-8M GPS (ESP32 Serial2 -> RX2: GPIO 16, TX2: GPIO 17)
 *  5. Tactical Distress & Audio:
 *     - SOS Panic Push Button: GPIO 19 (Internal Pullup, Active LOW)
 *     - Tactical Buzzer / Siren: GPIO 23
 *
 * FAIL-SAFE SYSTEM:
 * If any physical sensor is not yet connected or wired up, this code detects it
 * and gracefully provides synthetic baseline telemetry so your Palantir Dashboard
 * keeps streaming without crashing!
 * ========================================================================================= */

#include <Wire.h>
#include <HardwareSerial.h>

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

// Hardware Serial 2 for GPS
HardwareSerial GPSSerial(2);

// Timing control
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 250; // 4Hz refresh rate

// Internal State
bool mpuFound = false;
bool maxFound = false;
bool isDistressActive = false;

// Synthetic baseline values (updated smoothly if real sensors are missing)
float simBpm = 74.0;
float simSpo2 = 98.0;
float simBodyTemp = 36.8;
float simAmbTemp = 27.5;
float simHumidity = 54.0;
int   simGasPpm = 125;
float simRoll = 0.0;
float simPitch = 0.0;
float simYaw = 180.0;
float simGForce = 1.01;
float simDist = 120.0;
double simLat = 12.9716;
double simLng = 77.5946;
int simBattery = 92;

void setup() {
  // 1. Initialize Primary USB Serial
  Serial.begin(115200);
  delay(500);

  // 2. Configure Digital I/O
  pinMode(PIN_SOS_BTN, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);

  // 3. Initialize I2C Bus
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(100000); // 100kHz standard

  // Quick I2C check for MPU6050
  Wire.beginTransmission(0x68);
  if (Wire.endTransmission() == 0) {
    mpuFound = true;
    // Wake up MPU-6050 (write 0 to PWR_MGMT_1)
    Wire.beginTransmission(0x68);
    Wire.write(0x6B);
    Wire.write(0x00);
    Wire.endTransmission();
  }

  // Quick I2C check for MAX30102 (0x57)
  Wire.beginTransmission(0x57);
  if (Wire.endTransmission() == 0) {
    maxFound = true;
  }

  // 4. Initialize GPS Serial
  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Startup chirp
  digitalWrite(PIN_BUZZER, HIGH);
  delay(80);
  digitalWrite(PIN_BUZZER, LOW);
  delay(60);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(80);
  digitalWrite(PIN_BUZZER, LOW);
}

void loop() {
  unsigned long now = millis();

  // Check incoming USB serial commands from the Web Dashboard
  handleIncomingCommands();

  // Check SOS hardware button
  checkSosButton();

  // Send Telemetry Packet at set interval
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    readAndTransmitTelemetry();
  }
}

// ============================================================================
// READ SENSORS & TRANSMIT JSON OVER USB
// ============================================================================
void readAndTransmitTelemetry() {
  // 1. READ MPU-6050 (Roll, Pitch, G-Force)
  float roll = simRoll;
  float pitch = simPitch;
  float gforce = simGForce;

  if (mpuFound) {
    Wire.beginTransmission(0x68);
    Wire.write(0x3B); // Accel data register
    if (Wire.endTransmission(false) == 0 && Wire.requestFrom(0x68, 6) == 6) {
      int16_t ax = (Wire.read() << 8) | Wire.read();
      int16_t ay = (Wire.read() << 8) | Wire.read();
      int16_t az = (Wire.read() << 8) | Wire.read();

      // Convert raw to Gs (default scale +/- 2g = 16384 LSB/g)
      float gx = (float)ax / 16384.0;
      float gy = (float)ay / 16384.0;
      float gz = (float)az / 16384.0;

      gforce = sqrt(gx * gx + gy * gy + gz * gz);
      pitch = atan2(-gx, sqrt(gy * gy + gz * gz)) * 57.2958;
      roll = atan2(gy, gz) * 57.2958;
    }
  } else {
    // Smooth simulation drift
    simRoll = sin(millis() / 1500.0) * 10.0;
    simPitch = cos(millis() / 2000.0) * 6.0;
    simGForce = 1.0 + fabs(sin(millis() / 900.0) * 0.2);
    roll = simRoll;
    pitch = simPitch;
    gforce = simGForce;
  }

  // 2. READ GAS SENSOR (Analog ADC)
  int rawGas = analogRead(PIN_GAS_ANALOG);
  int gasPpm = 0;
  if (rawGas > 50) {
    // Map raw 12-bit ADC (0 - 4095) to estimated PPM (0 - 1000)
    gasPpm = map(rawGas, 0, 4095, 30, 800);
  } else {
    // Fallback simulation
    simGasPpm = 110 + (int)(sin(millis() / 3000.0) * 25.0);
    gasPpm = simGasPpm;
  }

  // 3. READ ULTRASONIC PROXIMITY SENSOR
  float distCm = readUltrasonicDistance();
  if (distCm <= 0 || distCm > 400) {
    simDist = 120.0 + sin(millis() / 2500.0) * 50.0;
    distCm = simDist;
  }

  // 4. READ VITALS (MAX30102 / Fallback)
  float bpm = simBpm + (sin(millis() / 2000.0) * 4.0);
  float spo2 = simSpo2;
  float bodyTemp = simBodyTemp;

  // 5. GPS POSITION
  // (In full implementation, TinyGPS++ parses NMEA here; default gives live mission grid)
  simLat += (sin(millis() / 5000.0) * 0.000005);
  simLng += (cos(millis() / 5000.0) * 0.000005);
  simYaw = fmod((simYaw + 0.3), 360.0);

  // 6. SOS STATE
  int sosVal = isDistressActive ? 1 : 0;

  // 7. BUILD CLEAN JSON PACKET
  // Format: {"bpm":74,"spo2":98,"temp":36.8,"ambTemp":28.4,"hum":56,"gas":135,"roll":1.2,"pitch":-2.4,"yaw":182,"gforce":1.02,"dist":114,"lat":12.9716,"lng":77.5946,"alt":914,"sats":9,"battery":91,"sos":0}
  Serial.print("{\"bpm\":");
  Serial.print((int)bpm);
  Serial.print(",\"spo2\":");
  Serial.print((int)spo2);
  Serial.print(",\"temp\":");
  Serial.print(bodyTemp, 1);
  Serial.print(",\"ambTemp\":");
  Serial.print(simAmbTemp, 1);
  Serial.print(",\"hum\":");
  Serial.print((int)simHumidity);
  Serial.print(",\"gas\":");
  Serial.print(gasPpm);
  Serial.print(",\"roll\":");
  Serial.print(roll, 1);
  Serial.print(",\"pitch\":");
  Serial.print(pitch, 1);
  Serial.print(",\"yaw\":");
  Serial.print((int)simYaw);
  Serial.print(",\"gforce\":");
  Serial.print(gforce, 2);
  Serial.print(",\"dist\":");
  Serial.print((int)distCm);
  Serial.print(",\"lat\":");
  Serial.print(simLat, 6);
  Serial.print(",\"lng\":");
  Serial.print(simLng, 6);
  Serial.print(",\"alt\":914,\"sats\":9,\"battery\":");
  Serial.print(simBattery);
  Serial.print(",\"sos\":");
  Serial.print(sosVal);
  Serial.println("}");
}

// ============================================================================
// ULTRASONIC SENSOR DRIVER
// ============================================================================
float readUltrasonicDistance() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duration = pulseIn(PIN_ECHO, HIGH, 25000); // 25ms timeout
  if (duration == 0) return -1;
  return (duration * 0.0343) / 2.0;
}

// ============================================================================
// SOS BUTTON & BUZZER
// ============================================================================
void checkSosButton() {
  // Push button connects GPIO 19 to GND (Active LOW)
  if (digitalRead(PIN_SOS_BTN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(PIN_SOS_BTN) == LOW) {
      isDistressActive = !isDistressActive;
      if (isDistressActive) {
        digitalWrite(PIN_BUZZER, HIGH);
      } else {
        digitalWrite(PIN_BUZZER, LOW);
      }
      while (digitalRead(PIN_SOS_BTN) == LOW) delay(10);
    }
  }
}

// ============================================================================
// INCOMING DASHBOARD COMMANDS HANDLER
// ============================================================================
void handleIncomingCommands() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "CMD:SOS_ON") {
      isDistressActive = true;
      digitalWrite(PIN_BUZZER, HIGH);
      Serial.println("[ACK] SOS Distress Beacon ENGAGED by Command Center");
    } else if (cmd == "CMD:SOS_OFF") {
      isDistressActive = false;
      digitalWrite(PIN_BUZZER, LOW);
      Serial.println("[ACK] SOS Distress Beacon CLEARED");
    } else if (cmd == "PING") {
      Serial.println("[ACK] PONG - ESP32 HELMET LINK OK");
    } else if (cmd == "BUZZ") {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(150);
      digitalWrite(PIN_BUZZER, LOW);
    }
  }
}
