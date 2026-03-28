import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { winstonConfig } from './logger/winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });
  const logger = WinstonModule.createLogger(winstonConfig);

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Smart Farm IoT API')
    .setDescription('REST API for Smart Farm IoT backend — sensors, devices, dashboard, action logs')
    .setVersion('1.0')
    .addTag('Devices', 'LED device management and control')
    .addTag('Sensors', 'Sensor registration and listing')
    .addTag('Sensor Data', 'Historical sensor readings')
    .addTag('Dashboard', 'Chart data and latest readings for the dashboard')
    .addTag('Action Logs', 'Device command execution history')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`IoT Backend running on http://localhost:${port}`);
  logger.log(`REST API base: http://localhost:${port}/api/v1`);
  logger.log(`WebSocket /sensors  → event: sensor_data`);
  logger.log(`WebSocket /devices  → event: device_status`);
}

bootstrap();
