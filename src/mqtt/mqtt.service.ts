import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';

type MessageHandler = (topic: string, payload: Buffer) => void;
const topic: string = "";

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private handlers: Map<typeof topic, MessageHandler[]> = new Map();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('MQTT_HOST', 'localhost');
    const port = this.configService.get<number>('MQTT_PORT', 1883);
    const clientId = this.configService.get<string>('MQTT_CLIENT_ID', 'iot-backend');
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');

    const options: mqtt.IClientOptions = {
      clientId,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };

    if (username) options.username = username;
    if (password) options.password = password;

    this.client = mqtt.connect(`mqtt://${host}:${port}`, options);

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${host}:${port}`);
      // Re-subscribe to all registered topics after reconnect
      for (const topic of this.handlers.keys()) {
        this.client.subscribe(topic, (err) => {
          if (err) this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
          else this.logger.log(`Subscribed to topic: ${topic}`);
        });
      }
    });

    this.client.on('message', (topic: string, payload: Buffer) => {
      this.logger.debug(`Message on [${topic}]: ${payload.toString()}`);
      // Exact match
      if (this.handlers.has(topic)) {
        this.handlers.get(topic).forEach((handler) => handler(topic, payload));
      }
      // Wildcard match
      for (const [pattern, handlers] of this.handlers.entries()) {
        if (pattern !== topic && this.topicMatches(pattern, topic)) {
          handlers.forEach((h) => h(topic, payload));
        }
      }
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });

    this.client.on('offline', () => {
      this.logger.warn('MQTT client offline');
    });

    this.client.on('reconnect', () => {
      this.logger.log('MQTT reconnecting...');
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  subscribe(topic: string, handler: MessageHandler): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
      if (this.client?.connected) {
        this.client.subscribe(topic, (err) => {
          if (err) this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
          else this.logger.log(`Subscribed to topic: ${topic}`);
        });
      }
    }
    this.handlers.get(topic).push(handler);
  }

  unsubscribe(topic: string): void {
    this.handlers.delete(topic);
    if (this.client?.connected) {
      this.client.unsubscribe(topic);
    }
  }

  publish(topic: string, message: string | object): void {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    if (!this.client?.connected) {
      this.logger.warn(`MQTT not connected; cannot publish to ${topic}`);
      return;
    }
    this.client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) this.logger.error(`Publish error on ${topic}: ${err.message}`);
      else this.logger.debug(`Published to [${topic}]: ${payload}`);
    });
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  // MQTT wildcard matching: + = single level, # = multi level
  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] === '+') continue;
      if (patternParts[i] !== topicParts[i]) return false;
    }
    return patternParts.length === topicParts.length;
  }
}
