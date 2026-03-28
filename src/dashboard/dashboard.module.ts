import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../devices/entities/device.entity';
import { Sensor } from '../sensors/entities/sensor.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SensorDataModule } from '../sensor-data/sensor-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sensor, Device]),
    SensorDataModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
