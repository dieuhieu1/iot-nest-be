import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Sensor } from './entities/sensor.entity';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { SensorDataService } from '../sensor-data/sensor-data.service';
import { SensorsGateway } from './sensors.gateway';

@Injectable()
export class SensorsService implements OnModuleInit {
  private readonly logger = new Logger(SensorsService.name);
  private readonly sensorTopic: string;

  constructor(
    @InjectRepository(Sensor)
    private sensorRepo: Repository<Sensor>,
    private configService: ConfigService,
    private mqttService: MqttService,
    private sensorDataService: SensorDataService,
    private sensorsGateway: SensorsGateway,
  ) {
    this.sensorTopic = this.configService.get<string>('SENSOR_TOPIC', 'sensor/data');
  }

  onModuleInit() {
    this.mqttService.unsubscribe(this.sensorTopic);
    // Assign Handler to the Topic key
    this.mqttService.subscribe(this.sensorTopic, async (topic, payload) => {
      try {
        const raw = payload.toString();
        const message: { sensorCode: string; value: number } = JSON.parse(raw);

        if (!message.sensorCode || message.value === undefined) {
          this.logger.warn(`Invalid sensor payload: ${raw}`);
          return;
        }

        const sensor = await this.sensorRepo.findOne({
          where: { sensorCode: message.sensorCode, isActive: true },
        });

        if (!sensor) {
          this.logger.warn(`No active sensor found for sensorCode "${message.sensorCode}"`);
          return;
        }

        await this.sensorRepo.update(sensor.id, { lastSeen: new Date() });

        const saved = await this.sensorDataService.save({
          sensorId: sensor.id,
          value: message.value,
          status: 'Normal',
        });

        this.sensorsGateway.emitSensorData({
          sensorCode: sensor.sensorCode,
          type: sensor.type,
          unit: sensor.unit ?? '',
          value: saved.value,
          status: saved.status,
          recordedAt: saved.recordedAt,
        });

        this.logger.log(
          `[MQTT] ${sensor.sensorCode} | ${sensor.type} | value=${saved.value} ${sensor.unit ?? ''} | status=${saved.status} | id=${saved.id}`,
        );
      } catch (err) {
        this.logger.error(`MQTT sensor ingestion error: ${err.message}`);
      }
    });

    this.logger.log(`Subscribed to sensor topic: ${this.sensorTopic}`);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: Sensor[]; meta: object }> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    let query = this.sensorRepo
      .createQueryBuilder('sensor')
      .where('sensor.isActive = :isActive', { isActive: true });

    if (params.search) {
      query = query.andWhere(
        '(sensor.name ILIKE :search OR sensor.sensorCode ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }

    const [data, total] = await query
      .orderBy('sensor.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Sensor> {
    const sensor = await this.sensorRepo.findOne({ where: { id, isActive: true } });
    if (!sensor) throw new NotFoundException(`Sensor #${id} not found`);
    return sensor;
  }

  async create(dto: CreateSensorDto): Promise<Sensor> {
    const sensor = this.sensorRepo.create(dto);
    return this.sensorRepo.save(sensor);
  }

  async softDelete(id: number): Promise<void> {
    await this.findOne(id);
    await this.sensorRepo.update(id, { isActive: false });
  }
}
