import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../devices/entities/device.entity';
import { Sensor } from '../sensors/entities/sensor.entity';
import { SensorDataService } from '../sensor-data/sensor-data.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sensor)
    private sensorRepo: Repository<Sensor>,
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
    private sensorDataService: SensorDataService,
  ) {}

  async getChartData(limit: number = 20) {
    const cappedLimit = Math.min(limit, 100);

    const sensors = await this.sensorRepo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    const datasets = await Promise.all(
      sensors.map(async (sensor) => {
        const readings = await this.sensorDataService.getLastNBySensor(sensor.id, cappedLimit);
        // Reverse so data is chronological (oldest first) for charts
        const chronological = readings.reverse();

        return {
          sensorCode: sensor.sensorCode,
          type: sensor.type,
          unit: sensor.unit ?? '',
          data: chronological.map((r) => ({
            value: r.value,
            recordedAt: r.recordedAt,
          })),
        };
      }),
    );

    return { datasets };
  }

  async getLatestReadings() {
    const sensors = await this.sensorRepo.find({
      where: { isActive: true },
      order: { sensorCode: 'ASC' },
    });

    const readings = await Promise.all(
      sensors.map(async (sensor) => {
        const latest = await this.sensorDataService.getLatestBySensor(sensor.id);
        return {
          sensorCode: sensor.sensorCode,
          type: sensor.type,
          unit: sensor.unit ?? '',
          value: latest?.value ?? null,
          status: latest?.status ?? null,
          recordedAt: latest?.recordedAt ?? null,
        };
      }),
    );

    return { readings };
  }

  async getDevicePanel() {
    const devices = await this.deviceRepo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
    return { devices };
  }
}
