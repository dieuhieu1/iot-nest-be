import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');

export const winstonConfig: winston.LoggerOptions = {
  transports: [
    // Console — colorized, NestJS-style format
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike('IoT', {
          prettyPrint: true,
          colors: true,
        }),
      ),
    }),

    // All logs → logs/app.log
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // Errors only → logs/error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
};
