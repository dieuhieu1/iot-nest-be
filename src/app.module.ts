import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logger/winston.logger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttModule } from './mqtt/mqtt.module';
import { DevicesModule } from './devices/devices.module';
import { ActionLogsModule } from './action-logs/action-logs.module';
import { SensorDataModule } from './sensor-data/sensor-data.module';
import { SensorsModule } from './sensors/sensors.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { Device } from './devices/entities/device.entity';
import { ActionLog } from './action-logs/entities/action-log.entity';
import { SensorData } from './sensor-data/entities/sensor-data.entity';
import { Sensor } from './sensors/entities/sensor.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot(winstonConfig),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'iot_db'),
        entities: [Device, ActionLog, SensorData, Sensor],
        synchronize: true,
        logging: ['error'],
      }),
    }),

    MqttModule,
    ActionLogsModule,
    DevicesModule,
    SensorDataModule,
    SensorsModule,
    DashboardModule,
  ],
})
export class AppModule {}
