import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty({ example: 'Temperature LED' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'LED_TEMP_01' })
  @IsString()
  @IsNotEmpty()
  deviceCode: string;

  @ApiProperty({ example: 'Light' })
  @IsString()
  @IsNotEmpty()
  type: string;
}
