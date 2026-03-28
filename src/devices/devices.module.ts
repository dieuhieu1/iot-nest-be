import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesGateway } from './devices.gateway';
import { ActionLogsModule } from '../action-logs/action-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    ActionLogsModule,
  ],
  providers: [DevicesService, DevicesGateway],
  controllers: [DevicesController],
  exports: [DevicesService, DevicesGateway],
})
export class DevicesModule {}
