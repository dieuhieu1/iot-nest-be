import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindManyOptions, Repository } from 'typeorm';
import { ActionLog } from './entities/action-log.entity';

export interface ActionLogQuery {
  deviceId?: number;
  action?: string;
  executionStatus?: string;
  from?: Date;
  to?: Date;
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
    const { deviceId, action, executionStatus, from, to, limit = 50, offset = 0 } = params;

    const where: any = {};
    if (deviceId !== undefined) where.deviceId = deviceId;
    if (action) where.action = action;
    if (executionStatus) where.executionStatus = executionStatus;
    if (from && to) where.createdAt = Between(from, to);

    const options: FindManyOptions<ActionLog> = {
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
      skip: offset,
      relations: ['device'],
    };

    const [data, total] = await this.logRepo.findAndCount(options);
    return { data, meta: { total, limit, offset } };
  }

  async getByDevice(deviceId: number, limit = 50, offset = 0) {
    return this.query({ deviceId, limit, offset });
  }
}
