import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ControlDeviceDto {
  @ApiProperty({ enum: ['ON', 'OFF'], example: 'ON' })
  @IsString()
  @IsIn(['ON', 'OFF'])
  action: 'ON' | 'OFF';
}
