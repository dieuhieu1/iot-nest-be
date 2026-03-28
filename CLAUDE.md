# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
```bash
npm run start:dev      # Run with ts-node (no compile step)
npm run start:watch    # Watch mode via nodemon
```

**Build & Production:**
```bash
npm run build          # Compile TypeScript to ./dist
npm run start          # Run compiled output
```

No test framework is configured yet — `npm run test` is a placeholder.

## Architecture Overview

NestJS IoT backend connecting MQTT sensors/devices to a REST API and real-time WebSocket clients. Data is persisted in **PostgreSQL** via TypeORM (auto-sync enabled; schema is derived from entities directly).

### Module Dependency Graph

```
AppModule
├── ConfigModule (global)     ← loads .env variables
├── MqttModule (global)       ← wraps the mqtt npm client
├── SensorDataModule          ← stores incoming MQTT sensor readings
├── DeviceActionsModule       ← audit log of all on/off commands
├── DevicesModule
│     ├── MqttService         ← subscribes to device control topic on startup
│     └── DeviceActionsService← logs every control call
└── SensorsModule
      ├── MqttService         ← subscribes to sensor data topic on startup
      ├── SensorDataService   ← parses & persists MQTT payloads
      └── SensorsGateway      ← WebSocket/Socket.IO gateway (namespace: /sensors)
```

`MqttModule` is `@Global()`, so `MqttService` is available everywhere without re-importing.

### Project Structure

```
src/
├── app.module.ts
├── main.ts                              # Bootstrap, global pipes, CORS
├── mqtt/
│   ├── mqtt.module.ts                   # Global MQTT module
│   └── mqtt.service.ts                  # MQTT client wrapper (pub/sub, reconnect)
├── devices/
│   ├── devices.module.ts
│   ├── devices.controller.ts
│   ├── devices.service.ts
│   ├── dto/
│   │   ├── create-device.dto.ts
│   │   └── control-device.dto.ts
│   └── entities/
│       └── device.entity.ts
├── device-actions/
│   ├── device-actions.module.ts
│   ├── device-actions.controller.ts
│   ├── device-actions.service.ts
│   └── entities/
│       └── device-action.entity.ts
├── sensor-data/
│   ├── sensor-data.module.ts
│   ├── sensor-data.controller.ts
│   ├── sensor-data.service.ts
│   └── entities/
│       └── sensor-data.entity.ts
└── sensors/
    ├── sensors.module.ts
    ├── sensors.controller.ts
    ├── sensors.service.ts
    ├── sensors.gateway.ts               # Socket.IO WebSocket gateway
    ├── dto/
    │   └── create-sensor.dto.ts
    └── entities/
        └── sensor.entity.ts
```

## Entities & Schema

### Device (`devices` table)
| Field | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `deviceId` | string unique | e.g. "fan-01", "led-01" |
| `name` | string | |
| `description` | string nullable | |
| `isOn` | boolean | default: false |
| `status` | enum: ONLINE\|OFFLINE | default: OFFLINE |
| `controlTopic` | string nullable | MQTT topic for publishing commands |
| `lastSeen` | datetime nullable | updated on MQTT message |
| `createdAt` | datetime | auto |
| `updatedAt` | datetime | auto |

### Sensor (`sensors` table)
| Field | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `sensorId` | string unique | e.g. "dht11-01", "ldr-01" |
| `name` | string | |
| `description` | string nullable | |
| `type` | string nullable | e.g. "DHT11", "LDR", "PIR" |
| `status` | enum: ONLINE\|OFFLINE | default: OFFLINE |
| `lastSeen` | datetime nullable | updated on MQTT message |
| `createdAt` / `updatedAt` | datetime | auto |

### SensorData (`sensor_data` table)
| Field | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `sensorId` | int FK → Sensor | CASCADE delete |
| `topic` | string | MQTT topic of the message |
| `rawPayload` | text | raw MQTT message string |
| `temperature` | float nullable | extracted if sensor type is "temp"/"temperature" |
| `humidity` | float nullable | extracted if sensor type is "humidity" |
| `value` | float nullable | generic numeric value for other types |
| `unit` | string nullable | e.g. "°C", "%", "lux" |
| `extra` | text/JSON nullable | remaining JSON fields |
| `createdAt` | datetime | auto |

### DeviceAction (`device_actions` table)
| Field | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `deviceId` | int FK → Device | CASCADE delete |
| `action` | enum: TURN_ON\|TURN_OFF\|STATUS_QUERY | |
| `source` | enum: API\|MQTT\|SCHEDULE | default: API |
| `success` | boolean | default: true |
| `errorMessage` | string nullable | |
| `payload` | text/JSON nullable | |
| `createdAt` | datetime | auto |

## API Endpoints

### Devices (`/devices`)
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/devices` | — | List all devices (ordered by createdAt DESC) |
| GET | `/devices/:id` | — | Get device by ID |
| POST | `/devices` | `CreateDeviceDto` | Create a new device |
| PATCH | `/devices/:id/control` | `{ isOn: boolean }` | Control device state |
| POST | `/devices/:id/turn-on` | — | Shorthand turn on |
| POST | `/devices/:id/turn-off` | — | Shorthand turn off |
| DELETE | `/devices/:id` | — | Delete device (204) |

### Sensors (`/sensors`)
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/sensors` | — | List all sensors (ordered by createdAt DESC) |
| GET | `/sensors/:id` | — | Get sensor by ID |
| POST | `/sensors` | `CreateSensorDto` | Create a new sensor |
| DELETE | `/sensors/:id` | — | Delete sensor (204) |

### Sensor Data (`/sensor-data`)
| Method | Path | Query Params | Description |
|---|---|---|---|
| GET | `/sensor-data` | `sensorId`, `topic`, `from`, `to`, `limit` (max 500), `offset` | Query sensor readings |
| GET | `/sensor-data/sensor/:sensorId/latest` | — | Latest reading for a sensor |

### Device Actions (`/device-actions`)
| Method | Path | Query Params | Description |
|---|---|---|---|
| GET | `/device-actions` | `deviceId`, `action`, `source`, `success`, `from`, `to`, `limit` (max 500), `offset` | Query action log |
| GET | `/device-actions/device/:deviceId` | `limit`, `offset` | All actions for a device |

## MQTT Flow

### Sensor Ingestion (subscribe)
1. `SensorsService.onModuleInit` subscribes to `SENSOR_TOPIC` (default: `sensor/data`).
2. Sensors publish a JSON array: `[{ sensorId: 1, sensor: "temp", value: 25, unit: "°C" }, ...]`
3. `SensorDataService.parsePayload` maps sensor type to entity fields:
   - `"temp"` / `"temperature"` → `temperature`
   - `"humidity"` → `humidity`
   - anything else → `value`
   - remaining keys → `extra` (JSON text)
4. `SensorData` row saved; sensor `status → ONLINE` and `lastSeen` updated.
5. **`SensorsGateway` emits `sensor_data` event to all Socket.IO clients** (namespace `/sensors`).

### Device Control (publish)
1. REST API call → `DevicesService.control(id, isOn)` publishes `{ command: "ON"/"OFF", deviceId }` to `device.controlTopic` at QoS 1.
2. MQTT message on `DEVICE_CONTROL_TOPIC` (default: `device/control`) → `DevicesService` updates DB and logs action with `source: MQTT`.
3. Action is always logged to `DeviceAction` regardless of MQTT success.
4. If `controlTopic` is unset, the MQTT publish is skipped (warning logged) but the DB state is still updated.

`MqttService` supports MQTT wildcards (`+`, `#`) and re-subscribes to all registered topics on reconnect.

## WebSocket / Socket.IO

- **Gateway**: `SensorsGateway` (`src/sensors/sensors.gateway.ts`)
- **Namespace**: `/sensors`
- **CORS**: `origin: '*'`
- **Event emitted**: `sensor_data` — broadcast to all connected clients whenever new sensor data is ingested via MQTT
- Use this for live dashboards or real-time sensor monitoring

## Key Design Decisions

- **`synchronize: true`** in TypeORM — schema is auto-created/altered from entities. Disable before production and switch to migrations.
- **`controlTopic` is optional** — control commands always update DB state; MQTT publish is best-effort.
- **`ActionSource`** enum (`api | mqtt | schedule`) — pass explicitly when triggering control from non-API paths.
- **Payload limit** — `SensorDataQuery` and `DeviceActionQuery` both cap `limit` at 500 rows.
- **Global ValidationPipe** — `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- **CORS enabled globally** via `app.enableCors()`.

## Environment Variables

```env
# MQTT Broker
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=iot-backend

# MQTT Topics
SENSOR_TOPIC=sensor/data
DEVICE_CONTROL_TOPIC=device/control

# Application
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=iot_user
DB_PASSWORD=your_password
DB_NAME=iot_db
```

Copy `.env.example` to `.env` before first run.
