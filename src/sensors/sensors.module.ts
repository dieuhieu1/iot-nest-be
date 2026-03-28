import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sensor } from './entities/sensor.entity';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';
import { SensorsGateway } from './sensors.gateway';
import { SensorDataModule } from '../sensor-data/sensor-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sensor]),
    SensorDataModule,
  ],
  providers: [SensorsService, SensorsGateway],
  controllers: [SensorsController],
  exports: [SensorsService, SensorsGateway],
})
export class SensorsModule {}
