import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionLog } from './entities/action-log.entity';

export interface ActionLogQuery {
  deviceId?: number;
  action?: string;
  executionStatus?: string;
  date?: string;   // e.g. "2026-03-28" or "2026-03-28 12:51"
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
    const { deviceId, action, executionStatus, date, limit = 50, offset = 0 } = params;

    const qb = this.logRepo
      .createQueryBuilder('al')
      .leftJoinAndSelect('al.device', 'device')
      .orderBy('al.createdAt', 'DESC')
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
}
