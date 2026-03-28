import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { SensorData } from '../../sensor-data/entities/sensor-data.entity';

@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  sensorCode: string; // e.g. "DTH_TEMP_01", "DTH_HUM_01", "LDR_01"

  @Column()
  type: string; // "Temperature" | "Humidity" | "Light"

  @Column({ nullable: true })
  unit: string; // "°C" | "%" | "Lux"

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  lastSeen: Date;

  @OneToMany(() => SensorData, (data) => data.sensor)
  sensorData: SensorData[];

  @CreateDateColumn()
  createdAt: Date;
}
