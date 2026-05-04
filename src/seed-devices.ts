import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Device } from './devices/entities/device.entity';
import { ActionLog } from './action-logs/entities/action-log.entity';
import { SensorData } from './sensor-data/entities/sensor-data.entity';
import { Sensor } from './sensors/entities/sensor.entity';

dotenv.config();

const DEVICES = [
  { name: 'Smart Heater',   deviceCode: 'HEATER_01', type: 'Smart Heater'   },
  { name: 'Misting System', deviceCode: 'MIST_01',   type: 'Misting System' },
];

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     parseInt(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME     ?? 'iot_db',
    entities: [Device, ActionLog, SensorData, Sensor],
    synchronize: false,
  });

  await ds.initialize();
  const repo = ds.getRepository(Device);

  for (const d of DEVICES) {
    const exists = await repo.findOne({ where: { deviceCode: d.deviceCode } });
    if (!exists) {
      await repo.save(repo.create(d));
      console.log(`Created: ${d.name} (${d.deviceCode})`);
    } else {
      console.log(`Skipped (exists): ${d.name} (${d.deviceCode})`);
    }
  }

  await ds.destroy();
  console.log('Done.');
}

seed().catch((e) => { console.error(e); process.exit(1); });
