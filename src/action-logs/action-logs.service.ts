import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionLog } from './entities/action-log.entity';

export interface ActionLogQuery {
  deviceId?: number;
  action?: string;
  executionStatus?: string;
  date?: string; // e.g. "2026-03-28" or "2026-03-28 12:51"
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

@Injectable()
export class ActionLogsService {
  constructor(
    @InjectRepository(ActionLog)
    private logRepo: Repository<ActionLog>,
  ) {}

  async createProcessing(data: {
    deviceId: number;
    action: string;
    description?: string;
  }): Promise<ActionLog> {
    const entry = this.logRepo.create({
      deviceId: data.deviceId,
      action: data.action,
      executionStatus: 'PROCESSING',
      description: data.description,
    });
    return this.logRepo.save(entry);
  }

  async updateStatus(
    id: number,
    executionStatus: 'SUCCESS' | 'FAILURE',
    description?: string,
  ): Promise<ActionLog> {
    await this.logRepo.update(id, { executionStatus, description });
    return this.logRepo.findOne({ where: { id } });
  }

  async query(params: ActionLogQuery): Promise<{ data: ActionLog[]; meta: object }> {
    const { deviceId, action, executionStatus, date, sortOrder = 'DESC', limit = 50, offset = 0 } = params;

    const qb = this.logRepo
      .createQueryBuilder('al')
      .leftJoinAndSelect('al.device', 'device')
      .orderBy('al.createdAt', sortOrder)
      .take(Math.min(limit, 500))
      .skip(offset);

    if (deviceId !== undefined) qb.andWhere('al.deviceId = :deviceId', { deviceId });
    if (action) qb.andWhere('al.action = :action', { action });
    if (executionStatus) qb.andWhere('al.executionStatus = :executionStatus', { executionStatus });
    if (date) qb.andWhere("TO_CHAR(al.createdAt, 'YYYY-MM-DD HH24:MI:SS') LIKE :date", { date: `%${date}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, limit, offset } };
  }

  async getByDevice(deviceId: number, limit = 50, offset = 0) {
    return this.query({ deviceId, limit, offset });
  }

  async getStats(): Promise<
    {
      deviceId: number;
      deviceName: string;
      deviceType: string;
      onCount: number;
      offCount: number;
      totalCount: number;
    }[]
  > {
    const rows = await this.logRepo
      .createQueryBuilder('al')
      .select('al.deviceId', 'deviceId')
      .addSelect('device.name', 'deviceName')
      .addSelect('device.type', 'deviceType')
      .addSelect("SUM(CASE WHEN al.action = 'ON' THEN 1 ELSE 0 END)", 'onCount')
      .addSelect("SUM(CASE WHEN al.action = 'OFF' THEN 1 ELSE 0 END)", 'offCount')
      .addSelect('COUNT(*)', 'totalCount')
      .leftJoin('al.device', 'device')
      .where('al.executionStatus = :status', { status: 'SUCCESS' })
      .groupBy('al.deviceId')
      .addGroupBy('device.name')
      .addGroupBy('device.type')
      .orderBy('al.deviceId', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      deviceId: r.deviceId,
      deviceName: r.deviceName,
      deviceType: r.deviceType,
      onCount: parseInt(r.onCount) || 0,
      offCount: parseInt(r.offCount) || 0,
      totalCount: parseInt(r.totalCount) || 0,
    }));
  }
}
