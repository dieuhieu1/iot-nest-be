import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ControlDeviceDto } from './dto/control-device.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { DevicesGateway } from './devices.gateway';

@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly logger = new Logger(DevicesService.name);
  private readonly controlTopic: string;
  private readonly stateTopic: string;
  private readonly initRequestTopic = 'device/init/request';
  private readonly initResponseTopic = 'device/init/response';

  constructor(
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
    private configService: ConfigService,
    private mqttService: MqttService,
    private actionLogsService: ActionLogsService,
    private devicesGateway: DevicesGateway,
  ) {
    this.controlTopic = this.configService.get<string>(
      'SYSTEM_CONTROL_TOPIC',
      'system/control',
    );
    this.stateTopic = this.configService.get<string>(
      'SYSTEM_STATE_TOPIC',
      'system/state',
    );
  }

  onModuleInit() {
    // --- Subscribe: ESP32 ACK after executing a command ---
    this.mqttService.unsubscribe(this.stateTopic);
    this.mqttService.subscribe(this.stateTopic, async (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        if (message.type !== 'RESPONSE') return;
        await this.handleStateAck(message);
      } catch (err) {
        this.logger.error(`Failed to handle ${this.stateTopic}: ${err.message}`);
      }
    });

    // --- Subscribe: ESP32 reconnected, wants last known state from DB ---
    this.mqttService.unsubscribe(this.initRequestTopic);
    this.mqttService.subscribe(this.initRequestTopic, async (topic, payload) => {
      try {
        this.logger.log('ESP32 init request received — publishing device states from DB');
        await this.publishInitState();
      } catch (err) {
        this.logger.error(`Failed to handle init request: ${err.message}`);
      }
    });

    this.logger.log(`Subscribed to: ${this.stateTopic}, ${this.initRequestTopic}`);
  }

  // Publish all active device states so ESP32 can restore LED pins on reconnect
  private async publishInitState() {
    const devices = await this.deviceRepo.find({ where: { isActive: true } });

    // Build { "LED_TEMP_01": "OFF", "LED_HUM_01": "ON", ... }
    const stateMap: Record<string, string> = {};
    for (const device of devices) {
      stateMap[device.deviceCode] = device.currentStatus;
    }

    this.mqttService.publish(this.initResponseTopic, stateMap);
    this.logger.log(`Published init state to ${this.initResponseTopic}: ${JSON.stringify(stateMap)}`);
  }

  private async handleStateAck(message: {
    source: string;   // deviceCode e.g. "LED_01"
    type: string;     // "RESPONSE"
    status: string;   // "ON_SUCCESS" | "OFF_SUCCESS" | "ON_FAILURE" | "OFF_FAILURE"
    logId: number;
  }) {
    const { source, status, logId } = message;

    if (!logId) {
      this.logger.warn(`ACK from ${source} missing logId, skipping update`);
      return;
    }

    const isSuccess = status.endsWith('_SUCCESS');
    const executionStatus = isSuccess ? 'SUCCESS' : 'FAILURE';
    const newDeviceStatus = status.startsWith('ON') ? 'ON' : 'OFF';

    await this.actionLogsService.updateStatus(
      logId,
      executionStatus,
      isSuccess ? undefined : `ESP32 reported: ${status}`,
    );

    const device = await this.deviceRepo.findOne({
      where: { deviceCode: source, isActive: true },
    });

    if (!device) {
      this.logger.warn(`ACK received for unknown deviceCode: ${source}`);
      return;
    }

    if (isSuccess) {
      await this.deviceRepo.update(device.id, { currentStatus: newDeviceStatus });
    }

    this.devicesGateway.emitDeviceStatus({
      deviceId: device.id,
      deviceCode: device.deviceCode,
      currentStatus: isSuccess ? newDeviceStatus : device.currentStatus,
      executionStatus,
      logId,
    });

    this.logger.log(`ACK log#${logId} ${source} → ${executionStatus}`);
  }

  async findAll(): Promise<Device[]> {
    return this.deviceRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Device> {
    const device = await this.deviceRepo.findOne({ where: { id, isActive: true } });
    if (!device) throw new NotFoundException(`Device #${id} not found`);
    return device;
  }

  async create(dto: CreateDeviceDto): Promise<Device> {
    const device = this.deviceRepo.create(dto);
    return this.deviceRepo.save(device);
  }

  async control(id: number, dto: ControlDeviceDto): Promise<{ message: string; logId: number }> {
    const device = await this.findOne(id);

    const log = await this.actionLogsService.createProcessing({
      deviceId: device.id,
      action: dto.action,
      description: `Command ${dto.action} sent to ${device.deviceCode}`,
    });

    this.mqttService.publish(this.controlTopic, {
      target: device.deviceCode,
      cmd: dto.action,
      logId: log.id,
    });

    this.logger.log(
      `Published to ${this.controlTopic}: target=${device.deviceCode} cmd=${dto.action} logId=${log.id}`,
    );

    return { message: 'Command sent', logId: log.id };
  }

  async softDelete(id: number): Promise<void> {
    await this.findOne(id);
    await this.deviceRepo.update(id, { isActive: false });
  }
}
