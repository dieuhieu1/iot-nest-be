/**
 * Smart Farm — ESP8266 Node
 *
 * Hardware:
 *   - DHT11  on pin D2 (GPIO 4)   → sensors: DTH_TEMP_01, DTH_HUM_01
 *   - LDR    on pin A0             → sensor:  LDR_01
 *   - LED_TEMP on pin D5 (GPIO 14) → device:  LED_TEMP_01
 *   - LED_HUM  on pin D6 (GPIO 12) → device:  LED_HUM_01
 *   - LED_LDR  on pin D7 (GPIO 13) → device:  LED_LDR_01
 *
 * Required libraries (install via Arduino Library Manager):
 *   - PubSubClient  by Nick O'Leary
 *   - DHT sensor library  by Adafruit
 *   - ArduinoJson  by Benoit Blanchon
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ===== WIFI =====
const char* WIFI_SSID = "PTIT_WIFI";
const char* WIFI_PASS = "";

// ===== MQTT BROKER =====
const char* MQTT_HOST = "172.11.30.195";
const int   MQTT_PORT = 2411;
const char* MQTT_USER = "dieuchinhhieu";
const char* MQTT_PASS = "Hieu24112004@";
const char* MQTT_CLIENT_ID = "ESP8266_SmartFarm";

// ===== MQTT TOPICS =====
const char* TOPIC_SENSOR_DATA    = "sensor/data";          // publish sensor readings
const char* TOPIC_SYSTEM_CONTROL = "system/control";       // subscribe — JSON commands from backend
const char* TOPIC_SYSTEM_STATE   = "system/state";         // publish  — ACK after executing command
const char* TOPIC_INIT_REQUEST   = "device/init/request";  // publish  — request DB state on reconnect
const char* TOPIC_INIT_RESPONSE  = "device/init/response"; // subscribe — backend replies with DB state

// ===== DEVICE CODES (must match backend DB exactly) =====
const char* DEVICE_LED_TEMP = "LED_TEMP_01";
const char* DEVICE_LED_HUM  = "LED_HUM_01";
const char* DEVICE_LED_LDR  = "LED_LDR_01";

// ===== SENSOR CODES (must match backend DB exactly) =====
const char* SENSOR_TEMP = "DTH_TEMP_01";
const char* SENSOR_HUM  = "DTH_HUM_01";
const char* SENSOR_LDR  = "LDR_01";

// ===== PINS =====
#define DHT_PIN   4   // D2
#define LDR_PIN   A0
#define PIN_LED_TEMP 14  // D5
#define PIN_LED_HUM  12  // D6
#define PIN_LED_LDR  13  // D7

#define DHTTYPE DHT11

// ===== OBJECTS =====
DHT dht(DHT_PIN, DHTTYPE);
WiFiClient espClient;
PubSubClient mqtt(espClient);

// ===== STATE =====
unsigned long lastSensorPublish = 0;
bool autoMode  = true;
bool flashMode = false;

// ============================================================
//  HELPERS
// ============================================================

void setLed(const char* deviceCode, bool on) {
  int pin = -1;
  if (strcmp(deviceCode, DEVICE_LED_TEMP) == 0) pin = PIN_LED_TEMP;
  else if (strcmp(deviceCode, DEVICE_LED_HUM)  == 0) pin = PIN_LED_HUM;
  else if (strcmp(deviceCode, DEVICE_LED_LDR)  == 0) pin = PIN_LED_LDR;

  if (pin != -1) {
    digitalWrite(pin, on ? HIGH : LOW);
    Serial.printf("│ LED %s → %s\n", deviceCode, on ? "ON" : "OFF");
  }
}

// Publish ACK to system/state after executing a command
void publishAck(const char* deviceCode, const char* cmd, int logId, bool success) {
  StaticJsonDocument<128> doc;
  doc["source"] = deviceCode;
  doc["type"]   = "RESPONSE";
  doc["status"] = String(cmd) + (success ? "_SUCCESS" : "_FAILURE");
  doc["logId"]  = logId;

  char buf[128];
  serializeJson(doc, buf);
  mqtt.publish(TOPIC_SYSTEM_STATE, buf);
  Serial.printf("│ ACK → system/state: %s\n", buf);
}

// Publish one sensor reading: { "sensorCode": "...", "value": ... }
void publishSensor(const char* sensorCode, float value) {
  StaticJsonDocument<96> doc;
  doc["sensorCode"] = sensorCode;
  doc["value"]      = value;

  char buf[96];
  serializeJson(doc, buf);
  mqtt.publish(TOPIC_SENSOR_DATA, buf);
}

// ============================================================
//  MQTT CALLBACK
// ============================================================

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String topicStr;
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  topicStr = String(topic);

  Serial.println("┌─── MQTT Received ───────────────────────────");
  Serial.println("│ Topic: " + topicStr);
  Serial.println("│ Data : " + message);

  // ──────────────────────────────────────────────
  // 1) INIT RESPONSE — backend sends current DB state on reconnect
  // ──────────────────────────────────────────────
  if (topicStr == TOPIC_INIT_RESPONSE) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, message);
    if (err) {
      Serial.println("│ [ERROR] JSON parse: " + String(err.c_str()));
      Serial.println("└─────────────────────────────────────────────");
      return;
    }

    // Restore each LED to its last known state from DB
    if (doc.containsKey(DEVICE_LED_TEMP)) {
      setLed(DEVICE_LED_TEMP, strcmp(doc[DEVICE_LED_TEMP], "ON") == 0);
    }
    if (doc.containsKey(DEVICE_LED_HUM)) {
      setLed(DEVICE_LED_HUM,  strcmp(doc[DEVICE_LED_HUM], "ON") == 0);
    }
    if (doc.containsKey(DEVICE_LED_LDR)) {
      setLed(DEVICE_LED_LDR,  strcmp(doc[DEVICE_LED_LDR], "ON") == 0);
    }
    Serial.println("│ [OK] LEDs restored from DB state");
    Serial.println("└─────────────────────────────────────────────");
    return;
  }

  // ──────────────────────────────────────────────
  // 2) SYSTEM CONTROL — JSON command from backend
  //    { "target": "LED_TEMP_01", "cmd": "ON", "logId": 100 }
  // ──────────────────────────────────────────────
  if (topicStr == TOPIC_SYSTEM_CONTROL) {
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, message);
    if (err) {
      Serial.println("│ [ERROR] JSON parse: " + String(err.c_str()));
      Serial.println("└─────────────────────────────────────────────");
      return;
    }

    const char* target = doc["target"];
    const char* cmd    = doc["cmd"];
    int logId          = doc["logId"] | 0;

    // Check if this command targets one of our LEDs
    bool isMine = (strcmp(target, DEVICE_LED_TEMP) == 0 ||
                   strcmp(target, DEVICE_LED_HUM)  == 0 ||
                   strcmp(target, DEVICE_LED_LDR)  == 0);

    if (!isMine) {
      Serial.println("│ Not my device — ignored");
      Serial.println("└─────────────────────────────────────────────");
      return;
    }

    // Switch to manual mode so auto doesn't override the command
    autoMode  = false;
    flashMode = false;

    bool turnOn = strcmp(cmd, "ON") == 0;
    setLed(target, turnOn);

    // ACK back to backend — backend updates action log + emits WebSocket
    publishAck(target, cmd, logId, true);

    Serial.printf("│ Executed: %s → %s (logId=%d)\n", target, cmd, logId);
    Serial.println("└─────────────────────────────────────────────");
    return;
  }

  // ──────────────────────────────────────────────
  // 3) LEGACY device/control — plain text (keep for manual testing)
  // ──────────────────────────────────────────────
  if (topicStr == "device/control") {
    if (message == "mode:auto") {
      autoMode = true; flashMode = false;
      Serial.println("│ Mode → AUTO");
    } else if (message == "mode:manual") {
      autoMode = false; flashMode = false;
      Serial.println("│ Mode → MANUAL");
    } else if (!autoMode) {
      if      (message == "all_on")   { digitalWrite(PIN_LED_TEMP, HIGH); digitalWrite(PIN_LED_HUM, HIGH); digitalWrite(PIN_LED_LDR, HIGH); }
      else if (message == "all_off")  { digitalWrite(PIN_LED_TEMP, LOW);  digitalWrite(PIN_LED_HUM, LOW);  digitalWrite(PIN_LED_LDR, LOW); }
      else if (message == "flash")     { flashMode = true; }
      else if (message == "flash_off") { flashMode = false; digitalWrite(PIN_LED_TEMP, LOW); digitalWrite(PIN_LED_HUM, LOW); digitalWrite(PIN_LED_LDR, LOW); }
      else if (message == "temp_on")   { digitalWrite(PIN_LED_TEMP, HIGH); }
      else if (message == "temp_off")  { digitalWrite(PIN_LED_TEMP, LOW); }
      else if (message == "hum_on")    { digitalWrite(PIN_LED_HUM,  HIGH); }
      else if (message == "hum_off")   { digitalWrite(PIN_LED_HUM,  LOW); }
      else if (message == "ldr_on")    { digitalWrite(PIN_LED_LDR,  HIGH); }
      else if (message == "ldr_off")   { digitalWrite(PIN_LED_LDR,  LOW); }
    }
  }

  Serial.println("└─────────────────────────────────────────────");
}

// ============================================================
//  MQTT RECONNECT
// ============================================================

void mqttReconnect() {
  while (!mqtt.connected()) {
    Serial.printf("[MQTT] Connecting to %s:%d ...\n", MQTT_HOST, MQTT_PORT);

    if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS)) {
      Serial.println("[MQTT] Connected!");

      // Subscribe to topics
      mqtt.subscribe(TOPIC_SYSTEM_CONTROL);  // JSON commands from backend
      mqtt.subscribe(TOPIC_INIT_RESPONSE);   // DB state response on reconnect
      mqtt.subscribe("device/control");      // legacy plain-text (testing)

      Serial.println("[MQTT] Subscribed to system/control, device/init/response, device/control");

      // Request last known device states from backend DB
      // Backend will respond on device/init/response
      String initReq = "{\"devices\":[\""
        + String(DEVICE_LED_TEMP) + "\",\""
        + String(DEVICE_LED_HUM)  + "\",\""
        + String(DEVICE_LED_LDR)  + "\"]}";
      mqtt.publish(TOPIC_INIT_REQUEST, initReq.c_str());
      Serial.println("[MQTT] Init request sent: " + initReq);

    } else {
      Serial.printf("[MQTT] Failed (rc=%d), retry in 2s...\n", mqtt.state());
      delay(2000);
    }
  }
}

// ============================================================
//  SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("      ESP8266 Smart Farm Node           ");
  Serial.println("========================================");

  pinMode(PIN_LED_TEMP, OUTPUT);
  pinMode(PIN_LED_HUM,  OUTPUT);
  pinMode(PIN_LED_LDR,  OUTPUT);
  pinMode(LDR_PIN, INPUT);

  // All LEDs off until init response arrives from backend
  digitalWrite(PIN_LED_TEMP, LOW);
  digitalWrite(PIN_LED_HUM,  LOW);
  digitalWrite(PIN_LED_LDR,  LOW);

  dht.begin();

  // WiFi
  Serial.print("[WiFi] Connecting to " + String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());

  // MQTT
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
}

// ============================================================
//  LOOP
// ============================================================

void loop() {
  if (!mqtt.connected()) mqttReconnect(); // reconnect triggers init request automatically
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastSensorPublish >= 2000) {
    lastSensorPublish = now;

    float h    = dht.readHumidity();
    float t    = dht.readTemperature();
    int rawLdr = analogRead(LDR_PIN);
    int lux    = 1023 - rawLdr;

    if (isnan(h) || isnan(t)) {
      Serial.println("[ERROR] DHT read failed!");
      return;
    }

    // ── AUTO MODE: control LEDs based on thresholds ──────────
    if (autoMode) {
      digitalWrite(PIN_LED_LDR,  lux < 512 ? HIGH : LOW);
      digitalWrite(PIN_LED_HUM,  h > 70    ? HIGH : LOW);
      digitalWrite(PIN_LED_TEMP, t > 27    ? HIGH : LOW);
    }

    // ── FLASH MODE ────────────────────────────────────────────
    if (flashMode && !autoMode) {
      digitalWrite(PIN_LED_TEMP, HIGH); digitalWrite(PIN_LED_HUM, LOW);  digitalWrite(PIN_LED_LDR, LOW);  delay(400);
      digitalWrite(PIN_LED_TEMP, LOW);  digitalWrite(PIN_LED_HUM, HIGH); digitalWrite(PIN_LED_LDR, LOW);  delay(400);
      digitalWrite(PIN_LED_TEMP, LOW);  digitalWrite(PIN_LED_HUM, LOW);  digitalWrite(PIN_LED_LDR, HIGH); delay(400);
    }

    // ── PUBLISH SENSOR DATA (one message per sensor) ──────────
    // Each message: { "sensorCode": "...", "value": ... }
    publishSensor(SENSOR_TEMP, round(t * 10) / 10.0);  // 1 decimal
    publishSensor(SENSOR_HUM,  round(h * 10) / 10.0);
    publishSensor(SENSOR_LDR,  (float)lux);

    // ── SERIAL LOG ────────────────────────────────────────────
    String lightLevel = lux < 256 ? "Very Dark" : lux < 512 ? "Dark" : lux < 768 ? "Bright" : "Very Bright";
    Serial.println("┌─── Sensor Publish ──────────────────────────");
    Serial.printf( "│ Temp : %.1f °C  → %s\n", t, SENSOR_TEMP);
    Serial.printf( "│ Hum  : %.1f %%  → %s\n", h, SENSOR_HUM);
    Serial.printf( "│ Light: %d Lux (%s) → %s\n", lux, lightLevel.c_str(), SENSOR_LDR);
    Serial.printf( "│ Mode : %s\n", autoMode ? "AUTO" : (flashMode ? "FLASH" : "MANUAL"));
    Serial.println("└─────────────────────────────────────────────");
  }
}
