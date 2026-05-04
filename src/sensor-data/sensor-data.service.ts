import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorData } from './entities/sensor-data.entity';

export interface SensorDataQuery {
  sensorId?: number;
  sensorName?: string;
  date?: string; // e.g. "2026-03-28" or "2026-03-28 12:51"
  value?: number; // exact match
  sortBy?: 'value' | 'recordedAt';
  sortOrder?: 'ASC' | 'DESC';
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
    const { sensorId, sensorName, date, value, sortBy = 'recordedAt', sortOrder = 'DESC', limit = 50, offset = 0 } = params;

    const sortColumn = sortBy === 'value' ? 'sd.value' : 'sd.recordedAt';

    const qb = this.sensorDataRepo
      .createQueryBuilder('sd')
      .leftJoinAndSelect('sd.sensor', 'sensor')
      .orderBy(sortColumn, sortOrder)
      .take(Math.min(limit, 500))
      .skip(offset);

    if (sensorId)  qb.andWhere('sd.sensorId = :sensorId', { sensorId });
    if (sensorName) qb.andWhere('sensor.name ILIKE :sensorName', { sensorName: `%${sensorName}%` });
    if (date) qb.andWhere("TO_CHAR(sd.recordedAt, 'YYYY-MM-DD HH24:MI:SS') LIKE :date", { date: `%${date}%` });
    if (value !== undefined) qb.andWhere('sd.value = :value', { value });

    const [data, total] = await qb.getManyAndCount();
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
