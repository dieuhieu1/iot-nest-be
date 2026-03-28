import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface DeviceStatusPayload {
  deviceId: number;
  deviceCode: string;
  currentStatus: string;
  executionStatus: string;
  logId: number;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/devices',
})
export class DevicesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DevicesGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`[/devices] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[/devices] Client disconnected: ${client.id}`);
  }

  emitDeviceStatus(payload: DeviceStatusPayload) {
    this.server.emit('device_status', payload);
  }
}
