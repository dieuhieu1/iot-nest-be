<div align="center">

# 🌱 Smart Farm IoT Backend

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=26&pause=1000&color=22C55E&center=true&vCenter=true&width=700&lines=Smart+Farm+IoT+Backend;ESP8266+%2B+NestJS+%2B+MQTT+%2B+Socket.IO;Real-time+Sensor+Monitoring+%26+Device+Control" alt="Typing SVG" />

<br/>

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white)](https://mqtt.org/)
[![Socket.io](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://swagger.io/)

<br/>

> **A real-time IoT backend for a Smart Farm system** — connects an ESP8266 hardware node
> (DHT11 + LDR sensors, 3 LEDs) to a REST API and live WebSocket dashboard.
> Sensor data streams via MQTT, device control uses an async ACK lifecycle, and
> the ESP8266 automatically restores LED states on reconnect via retained MQTT messages.

<br/>

[🚀 Quick Start](#-quick-start) •
[📖 API Docs](#-api-reference) •
[🏗️ Architecture](#️-architecture) •
[⚡ WebSocket](#-websocket) •
[📡 MQTT Topics](#-mqtt-topics) •
[⚙️ Configuration](#️-environment-variables)

</div>

---

## ✨ Features

<table>
<tr>
<td>

📡 **Real-time Sensor Streaming**
- MQTT ingestion from ESP8266
- 3 sensors: Temperature, Humidity, Light
- One message per sensor (`sensorCode` + `value`)
- Live push via Socket.IO `/sensors` namespace

</td>
<td>

💡 **Device Control Lifecycle**
- `PROCESSING → SUCCESS / FAILURE` via MQTT ACK
- Immediate HTTP response, async confirmation
- Full action log with execution status
- Live push via Socket.IO `/devices` namespace

</td>
</tr>
<tr>
<td>

🔌 **ESP8266 Reconnect State Restore**
- Retained MQTT message on `device/init/response`
- LED pins restored to DB state on power-up
- No polling — state delivered on subscription
- Updated on every successful device command

</td>
<td>

📊 **Dashboard API**
- Latest sensor values for stat cards
- Last N readings per sensor for charts
- Active device panel
- Paginated sensor list with search

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | NestJS + TypeScript |
| **Database** | PostgreSQL 15+ + TypeORM |
| **Messaging** | MQTT via mqtt.js (Mosquitto broker) |
| **Real-time** | Socket.IO (two namespaces) |
| **Logging** | Winston + nest-winston |
| **API Docs** | Swagger / OpenAPI 3 |
| **Hardware** | ESP8266 + DHT11 + LDR + Arduino |

---

## 🏗️ Architecture

```
  ┌─────────────────────────────────────────────┐
  │              ESP8266 Hardware               │
  │  DHT11 (Temp/Hum)   LDR (Light)   3x LED   │
  └──────────────┬──────────────────────────────┘
                 │  MQTT pub/sub
                 ▼
  ┌─────────────────────────────────────────────┐
  │           MQTT Broker (Mosquitto)           │
  └──────────────┬──────────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────────┐
  │            NestJS Backend                   │
  │                                             │
  │  SensorsService  ──►  SensorsGateway        │
  │  DevicesService  ──►  DevicesGateway        │
  │  DashboardService                           │
  │  ActionLogsService                          │
  │             │                               │
  │             ▼                               │
  │         PostgreSQL                          │
  └──────────────┬──────────────────────────────┘
                 │  Socket.IO (/sensors, /devices)
                 ▼
  ┌─────────────────────────────────────────────┐
  │           Frontend Dashboard                │
  └─────────────────────────────────────────────┘
```

---

## 🔌 Hardware Pinout

| Component | Pin | Sensor / Device Code |
|---|---|---|
| DHT11 Temperature | D2 (GPIO 4) | `DTH_TEMP_01` |
| DHT11 Humidity | D2 (GPIO 4) | `DTH_HUM_01` |
| LDR Light Sensor | A0 | `LDR_01` |
| LED Temperature | D5 (GPIO 14) | `LED_TEMP_01` |
| LED Humidity | D6 (GPIO 12) | `LED_HUM_01` |
| LED Light | D7 (GPIO 13) | `LED_LDR_01` |

---

## 🚀 Quick Start

### Prerequisites

- Node.js `>= 18`
- PostgreSQL `>= 15`
- MQTT Broker (Mosquitto)

### 1 · Clone & Install

```bash
git clone <repo-url>
cd iot-backend
npm install
```

### 2 · Configure Environment

```bash
cp .env.example .env
# Edit .env with your MQTT broker and PostgreSQL credentials
```

### 3 · Setup PostgreSQL

```sql
CREATE DATABASE iot_db;
CREATE USER iot_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE iot_db TO iot_user;
ALTER USER iot_user WITH SUPERUSER;
```

### 4 · Run

```bash
npm run start:dev
```

> TypeORM `synchronize: true` auto-creates all tables on first start.

### 5 · Seed Initial Data

```powershell
.\seed.ps1
```

Creates the 3 sensors and 3 LED devices matching the ESP8266 firmware codes.

| URL | Description |
|---|---|
| `http://localhost:3000/api/v1` | REST API base |
| `http://localhost:3000/api/docs` | Swagger UI |

---

## ⚙️ Environment Variables

```env
# ── MQTT Broker ───────────────────────────────────
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_CLIENT_ID=iot-backend

# ── MQTT Topics ───────────────────────────────────
SENSOR_TOPIC=sensor/data
SYSTEM_CONTROL_TOPIC=system/control
SYSTEM_STATE_TOPIC=system/state

# ── Application ───────────────────────────────────
PORT=3000
NODE_ENV=development

# ── PostgreSQL ────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=iot_user
DB_PASSWORD=your_password
DB_NAME=iot_db
```

---

## 📖 API Reference

> Interactive docs: **`http://localhost:3000/api/docs`**

### 💡 Devices — `/api/v1/devices`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/devices` | List all active devices |
| `GET` | `/devices/:id` | Get device by ID |
| `POST` | `/devices` | Create a device |
| `PATCH` | `/devices/:id/control` | Send `ON` / `OFF` command |
| `DELETE` | `/devices/:id` | Soft delete |

**Control a device:**
```bash
curl -X PATCH http://localhost:3000/api/v1/devices/1/control \
  -H "Content-Type: application/json" \
  -d '{"action": "ON"}'
# ← { "message": "Command sent", "logId": 1 }
```

### 🌡️ Sensors — `/api/v1/sensors`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sensors?page=1&limit=10&search=DTH` | Paginated list + search |
| `GET` | `/sensors/:id` | Get sensor by ID |
| `POST` | `/sensors` | Create a sensor |
| `DELETE` | `/sensors/:id` | Soft delete |

### 📈 Sensor Data — `/api/v1/sensor-data`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sensor-data?sensorId=1&limit=50` | Query readings with filters |
| `GET` | `/sensor-data/sensor/:sensorId/latest` | Latest reading for a sensor |

### 📊 Dashboard — `/api/v1/dashboard`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/latest` | Latest value per sensor (stat cards) |
| `GET` | `/dashboard/charts?limit=20` | Last N readings per sensor (charts) |
| `GET` | `/dashboard/devices` | All active devices (device panel) |

### 📋 Action Logs — `/api/v1/action-logs`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/action-logs?executionStatus=SUCCESS` | Query logs with filters |
| `GET` | `/action-logs/device/:deviceId` | All logs for a device |

**Query filters:** `deviceId` · `action` · `executionStatus` · `from` · `to` · `limit` · `offset`

---

## ⚡ WebSocket

Connect via Socket.IO — no polling needed, the server pushes all updates.

| Namespace | Event | Payload | Trigger |
|---|---|---|---|
| `/sensors` | `sensor_data` | `{ sensorCode, type, unit, value, status, recordedAt }` | MQTT reading arrives |
| `/devices` | `device_status` | `{ deviceId, deviceCode, currentStatus, executionStatus, logId }` | ESP8266 ACKs command |

```js
// Live sensor data
const sensors = io('http://localhost:3000/sensors');
sensors.on('sensor_data', ({ sensorCode, value, unit, status }) => {
  console.log(`${sensorCode}: ${value} ${unit} [${status}]`);
  // DTH_TEMP_01: 28.9 °C [Normal]
});

// Device status updates
const devices = io('http://localhost:3000/devices');
devices.on('device_status', ({ deviceCode, currentStatus, executionStatus }) => {
  console.log(`${deviceCode} → ${currentStatus} (${executionStatus})`);
  // LED_TEMP_01 → ON (SUCCESS)
});
```

---

## 📡 MQTT Topics

| Topic | Direction | Payload |
|---|---|---|
| `sensor/data` | ESP8266 → Backend | `{ "sensorCode": "DTH_TEMP_01", "value": 28.9 }` |
| `system/control` | Backend → ESP8266 | `{ "target": "LED_TEMP_01", "cmd": "ON", "logId": 1 }` |
| `system/state` | ESP8266 → Backend | `{ "source": "LED_TEMP_01", "type": "RESPONSE", "status": "ON_SUCCESS", "logId": 1 }` |
| `device/init/request` | ESP8266 → Backend | `{ "devices": ["LED_TEMP_01", "LED_HUM_01", "LED_LDR_01"] }` |
| `device/init/response` | Backend → ESP8266 | `{ "LED_TEMP_01": "OFF", "LED_HUM_01": "ON", "LED_LDR_01": "OFF" }` *(retained)* |

---

## 💡 Device Control Flow

```
Frontend  ──►  PATCH /devices/1/control  { action: "ON" }
Backend   ──►  Creates ActionLog → PROCESSING
          ──►  Publishes system/control to MQTT broker
          ◄──  Returns { message: "Command sent", logId: 1 }  (immediate)

ESP8266   ──►  Receives command, toggles LED pin
          ──►  Publishes system/state ACK → { status: "ON_SUCCESS", logId: 1 }

Backend   ──►  Updates ActionLog → SUCCESS
          ──►  Updates device.currentStatus = "ON" in DB
          ──►  Refreshes retained message on broker
          ──►  Emits device_status via Socket.IO  ◄──  Frontend updates
```

---

## 🔌 ESP8266 Reconnect / Power-Up Flow

```
ESP8266 powers on
  ├─ Subscribes to device/init/response
  │     └─ Broker delivers retained message immediately  ✓
  │           { LED_TEMP_01: "ON", LED_HUM_01: "OFF", LED_LDR_01: "OFF" }
  │
  ├─ Sets LED pins to match retained state  ✓
  │
  └─ Publishes device/init/request  →  Backend responds with fresh DB state  ✓
```

> The `device/init/response` topic uses **retained messages** — the broker always holds
> the latest device state so the ESP8266 gets it the moment it subscribes,
> even without waiting for the backend to respond.

---

## 🗄️ Database Schema

### `devices`
| Column | Type | Notes |
|---|---|---|
| id | int PK | auto-increment |
| name | varchar | e.g. `"Temperature LED"` |
| deviceCode | varchar unique | e.g. `"LED_TEMP_01"` |
| type | varchar | e.g. `"Light"` |
| currentStatus | varchar | `"ON"` / `"OFF"` · default `"OFF"` |
| isActive | boolean | soft delete · default `true` |
| createdAt | timestamp | auto |

### `sensors`
| Column | Type | Notes |
|---|---|---|
| id | int PK | auto-increment |
| name | varchar | e.g. `"Temperature Sensor"` |
| sensorCode | varchar unique | e.g. `"DTH_TEMP_01"` |
| type | varchar | `"Temperature"` / `"Humidity"` / `"Light"` |
| unit | varchar nullable | `"°C"` / `"%"` / `"Lux"` |
| isActive | boolean | soft delete · default `true` |
| lastSeen | timestamptz nullable | updated on each MQTT message |
| createdAt | timestamp | auto |

### `sensor_data`
| Column | Type | Notes |
|---|---|---|
| id | int PK | auto-increment |
| sensorId | int FK → sensors | |
| value | float | sensor reading |
| status | varchar | `"Normal"` / `"Warning"` · default `"Normal"` |
| recordedAt | timestamp | auto |

### `action_logs`
| Column | Type | Notes |
|---|---|---|
| id | int PK | auto-increment |
| deviceId | int FK → devices | |
| action | varchar | `"ON"` / `"OFF"` |
| executionStatus | varchar | `"PROCESSING"` / `"SUCCESS"` / `"FAILURE"` |
| description | varchar nullable | error message on `FAILURE` |
| createdAt | timestamp | auto |

---

## 📁 Project Structure

```
iot-backend/
├── arduino/
│   └── smart_farm.ino              # ESP8266 firmware
├── logs/
│   ├── app.log                     # All logs (JSON)
│   └── error.log                   # Errors only (JSON)
├── src/
│   ├── app.module.ts
│   ├── main.ts                     # Bootstrap · Swagger · global pipes
│   ├── logger/
│   │   └── winston.logger.ts       # Winston config (console + file)
│   ├── mqtt/
│   │   ├── mqtt.module.ts
│   │   └── mqtt.service.ts         # MQTT client · pub/sub/retain · reconnect
│   ├── devices/
│   │   ├── devices.controller.ts
│   │   ├── devices.service.ts      # Control · ACK lifecycle · init state
│   │   ├── devices.gateway.ts      # Socket.IO /devices namespace
│   │   ├── devices.module.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── sensors/
│   │   ├── sensors.controller.ts
│   │   ├── sensors.service.ts      # MQTT ingestion · WebSocket emit
│   │   ├── sensors.gateway.ts      # Socket.IO /sensors namespace
│   │   ├── sensors.module.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── sensor-data/
│   │   ├── sensor-data.controller.ts
│   │   ├── sensor-data.service.ts
│   │   ├── sensor-data.module.ts
│   │   └── entities/
│   ├── action-logs/
│   │   ├── action-logs.controller.ts
│   │   ├── action-logs.service.ts
│   │   ├── action-logs.module.ts
│   │   └── entities/
│   └── dashboard/
│       ├── dashboard.controller.ts
│       ├── dashboard.service.ts
│       └── dashboard.module.ts
├── .env
├── .env.example
├── seed.ps1
└── package.json
```

---

## 📜 Scripts

```bash
npm run start:dev     # 🔥 Development with ts-node
npm run start:watch   # 👀 Watch mode via nodemon
npm run build         # 📦 Compile TypeScript → dist/
npm run start         # 🚀 Run production build
```

---

<div align="center">

Made with ❤️ using **NestJS** + **TypeScript**

[![NestJS](https://img.shields.io/badge/Powered%20by-NestJS-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![TypeORM](https://img.shields.io/badge/ORM-TypeORM-FE0803?style=flat-square)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MQTT](https://img.shields.io/badge/Messaging-MQTT-660066?style=flat-square&logo=eclipse-mosquitto&logoColor=white)](https://mqtt.org/)

</div>
