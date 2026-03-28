import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { dateTransformer } from '../../common/date.transformer';

@Entity('action_logs')
export class ActionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deviceId: number;

  @ManyToOne(() => Device, (device) => device.actionLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column()
  action: string; // "ON" | "OFF"

  @Column({ default: 'PROCESSING' })
  executionStatus: string; // "PROCESSING" | "SUCCESS" | "FAILURE"

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn({ transformer: dateTransformer })
  createdAt: string;
}
