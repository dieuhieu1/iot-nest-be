import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorData } from './entities/sensor-data.entity';
import { SensorDataService } from './sensor-data.service';
import { SensorDataController } from './sensor-data.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SensorData])],
  providers: [SensorDataService],
  controllers: [SensorDataController],
  exports: [SensorDataService],
})
export class SensorDataModule {}
