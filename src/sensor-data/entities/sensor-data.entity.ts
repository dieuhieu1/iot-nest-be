import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sensor } from '../../sensors/entities/sensor.entity';
import { dateTransformer } from '../../common/date.transformer';

@Entity('sensor_data')
export class SensorData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sensorId: number;

  @ManyToOne(() => Sensor, (sensor) => sensor.sensorData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sensorId' })
  sensor: Sensor;

  @Column({ type: 'float' })
  value: number;

  @Column({ default: 'Normal' })
  status: string; // "Normal" | "Warning"

  @CreateDateColumn({ name: 'recordedAt', transformer: dateTransformer })
  recordedAt: string;
}
