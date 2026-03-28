import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface SensorDataPayload {
  sensorCode: string;
  type: string;
  unit: string;
  value: number;
  status: string;
  recordedAt: Date;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/sensors',
})
export class SensorsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SensorsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`[/sensors] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[/sensors] Client disconnected: ${client.id}`);
  }

  emitSensorData(payload: SensorDataPayload) {
    this.server.emit('sensor_data', payload);
  }
}
