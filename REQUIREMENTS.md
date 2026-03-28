# Smart Farm IoT Backend — Feature Requirements

Based on: **BÁO CÁO THỰC HÀNH IOT** (Smart Farm Monitoring & Control System)

---

## 1. Database Schema (Final Agreed Design)

### 1.1 `devices` table

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `name` | varchar | display name, e.g. "Đèn LED số 1" |
| `device_code` | varchar unique | technical ID for MQTT, e.g. "LED_01" |
| `type` | varchar | e.g. "Light" |
| `current_status` | varchar | "ON" \| "OFF", default "OFF" |
| `is_active` | boolean | soft delete flag, default true |
| `created_at` | timestamp | auto |

---

### 1.2 `sensors` table

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `name` | varchar | display name |
| `sensor_code` | varchar unique | matches MQTT payload sensorCode |
| `type` | varchar | "Temperature" \| "Humidity" \| "Light" |
| `unit` | varchar nullable | "°C" \| "%" \| "Lux" |
| `is_active` | boolean | soft delete flag, default true |
| `last_seen` | datetime nullable | updated on every MQTT message |
| `created_at` | timestamp | auto |

**3 sensors in use:**
- `DTH_TEMP_01` — type: Temperature, unit: °C
- `DTH_HUM_01` — type: Humidity, unit: %
- `LDR_01` — type: Light, unit: Lux

---

### 1.3 `sensor_data` table

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `sensor_id` | int FK → sensors | CASCADE delete |
| `value` | float | the measured value |
| `status` | varchar | "Normal" \| "Warning", default "Normal" |
| `recorded_at` | timestamp | auto (renamed from createdAt) |

**No `dataType` column** — join with `sensors` gives `type` + `unit` for free.

---

### 1.4 `action_logs` table (replaces `device_actions`)

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `device_id` | int FK → devices | CASCADE delete |
| `action` | varchar | "ON" \| "OFF" |
| `execution_status` | varchar | "PROCESSING" \| "SUCCESS" \| "FAILURE" |
| `description` | varchar nullable | e.g. error detail |
| `created_at` | timestamp | auto |

**Lifecycle:** Created as `PROCESSING` → updated to `SUCCESS` or `FAILURE` after ESP32 ACK via `system/state`.

---

## 2. API Endpoints (all prefixed `/api/v1/`)

### Devices
| Method | Path | Body/Query |
|---|---|---|
| GET | `/devices` | — lists active only |
| GET | `/devices/:id` | — |
| POST | `/devices` | `{ name, deviceCode, type }` |
| PATCH | `/devices/:id/control` | `{ action: "ON"\|"OFF" }` |
| DELETE | `/devices/:id` | — soft delete |

### Sensors
| Method | Path | Body/Query |
|---|---|---|
| GET | `/sensors` | `?page&limit&search` — paginated + search |
| GET | `/sensors/:id` | — |
| POST | `/sensors` | `{ name, sensorCode, type, unit? }` |
| DELETE | `/sensors/:id` | — soft delete |

### Sensor Data
| Method | Path | Query |
|---|---|---|
| GET | `/sensor-data` | `?sensorId&from&to&limit&offset` |
| GET | `/sensor-data/sensor/:sensorId/latest` | — |

### Dashboard (NEW)
| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/charts?limit=20` | last N readings per sensor, chart format |
| GET | `/dashboard/latest` | latest value per sensor |
| GET | `/dashboard/devices` | all active devices + currentStatus |

### Action Logs (replaces device-actions)
| Method | Path | Query |
|---|---|---|
| GET | `/action-logs` | `?deviceId&action&executionStatus&from&to&limit&offset` |
| GET | `/action-logs/device/:deviceId` | — |

---

## 3. WebSocket (Socket.IO)

| Namespace | Event | Payload | Trigger |
|---|---|---|---|
| `/sensors` | `sensor_data` | `{ sensorCode, type, unit, value, status, recordedAt }` | MQTT sensor/data arrives |
| `/devices` | `device_status` | `{ deviceId, deviceCode, currentStatus, executionStatus, logId }` | ESP32 ACK via system/state |

**Note:** WebSocket prefix is NOT affected by `setGlobalPrefix`. Clients connect to `ws://host:3000/sensors` and `ws://host:3000/devices`.

---

## 4. MQTT Topics

| Topic | Direction | Payload |
|---|---|---|
| `sensor/data` | ESP32 → Backend | `{ sensorCode: "DTH_TEMP_01", value: 25.5 }` |
| `system/control` | Backend → ESP32 | `{ target: "LED_01", cmd: "ON", logId: 100 }` |
| `system/state` | ESP32 → Backend | `{ source: "LED_01", type: "RESPONSE", status: "ON_SUCCESS", logId: 100 }` |

`system/state` status values: `"ON_SUCCESS"`, `"OFF_SUCCESS"`, `"ON_FAILURE"`, `"OFF_FAILURE"`

---

## 5. Improved Flow (vs. original polling diagrams)

### Dashboard page load
```
Page open → GET /api/v1/dashboard/charts   (chart history, one call)
          → GET /api/v1/dashboard/latest   (card values, one call)
          → GET /api/v1/dashboard/devices  (device states, one call)
          → Connect Socket.IO /sensors
          → On sensor_data event → update charts + cards in real-time
```

### Device control
```
Toggle LED → PATCH /api/v1/devices/:id/control { action:"ON" }
           → Backend: create ActionLog(PROCESSING), publish system/control
           → HTTP 200 { message, logId } immediately
           → ESP32 executes → publish system/state ACK
           → Backend: update log → SUCCESS/FAILURE, update currentStatus
           → Emit device_status via /devices WebSocket
           → Frontend toggle updates instantly (no polling)
```

---

## 6. File Structure

```
src/
├── app.module.ts              — wires all modules
├── main.ts                    — setGlobalPrefix('api/v1')
├── mqtt/                      — unchanged (global)
├── action-logs/               — NEW (replaces device-actions)
│   ├── entities/action-log.entity.ts
│   ├── action-logs.service.ts
│   ├── action-logs.controller.ts
│   └── action-logs.module.ts
├── dashboard/                 — NEW
│   ├── dashboard.service.ts
│   ├── dashboard.controller.ts
│   └── dashboard.module.ts
├── devices/
│   ├── entities/device.entity.ts    — rewritten
│   ├── dto/create-device.dto.ts     — { name, deviceCode, type }
│   ├── dto/control-device.dto.ts    — { action: "ON"|"OFF" }
│   ├── devices.gateway.ts           — NEW: /devices namespace
│   ├── devices.service.ts           — rewritten
│   ├── devices.controller.ts        — rewritten
│   └── devices.module.ts            — rewritten
├── sensors/
│   ├── entities/sensor.entity.ts    — rewritten
│   ├── dto/create-sensor.dto.ts     — { name, sensorCode, type, unit? }
│   ├── sensors.gateway.ts           — improved payload
│   ├── sensors.service.ts           — rewritten (sensorCode lookup, one value/msg)
│   ├── sensors.controller.ts        — pagination + search
│   └── sensors.module.ts            — rewritten
└── sensor-data/
    ├── entities/sensor-data.entity.ts — rewritten (value, status, recordedAt only)
    ├── sensor-data.service.ts         — simplified
    └── sensor-data.controller.ts      — updated
```
