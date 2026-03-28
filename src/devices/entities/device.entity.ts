import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ActionLog } from '../../action-logs/entities/action-log.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  deviceCode: string; // e.g. "LED_01"

  @Column()
  type: string; // e.g. "Light"

  @Column({ default: 'OFF' })
  currentStatus: string; // "ON" | "OFF"

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ActionLog, (log) => log.device)
  actionLogs: ActionLog[];

  @CreateDateColumn()
  createdAt: Date;
}
