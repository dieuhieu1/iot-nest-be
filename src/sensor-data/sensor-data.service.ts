import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindManyOptions, Repository } from 'typeorm';
import { SensorData } from './entities/sensor-data.entity';

export interface SensorDataQuery {
  sensorId?: number;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SensorDataService {
  constructor(
    @InjectRepository(SensorData)
    private sensorDataRepo: Repository<SensorData>,
  ) {}

  async save(data: { sensorId: number; value: number; status?: string }): Promise<SensorData> {
    const entry = this.sensorDataRepo.create({
      sensorId: data.sensorId,
      value: data.value,
      status: data.status ?? 'Normal',
    });
    return this.sensorDataRepo.save(entry);
  }

  async query(params: SensorDataQuery): Promise<{ data: SensorData[]; total: number }> {
    const { sensorId, from, to, limit = 50, offset = 0 } = params;

    const where: any = {};
    if (sensorId) where.sensorId = sensorId;
    if (from && to) where.recordedAt = Between(from, to);

    const options: FindManyOptions<SensorData> = {
      where,
      order: { recordedAt: 'DESC' },
      take: Math.min(limit, 500),
      skip: offset,
      relations: ['sensor'],
    };

    const [data, total] = await this.sensorDataRepo.findAndCount(options);
    return { data, total };
  }

  async getLatestBySensor(sensorId: number): Promise<SensorData | null> {
    return this.sensorDataRepo.findOne({
      where: { sensorId },
      order: { recordedAt: 'DESC' },
      relations: ['sensor'],
    });
  }

  async getLastNBySensor(sensorId: number, limit: number): Promise<SensorData[]> {
    return this.sensorDataRepo.find({
      where: { sensorId },
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }
}
