import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSensorDto {
  @ApiProperty({ example: 'Temperature Sensor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'DTH_TEMP_01' })
  @IsString()
  @IsNotEmpty()
  sensorCode: string;

  @ApiProperty({ example: 'Temperature', description: 'Temperature | Humidity | Light' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: '°C', description: '°C | % | Lux' })
  @IsString()
  @IsOptional()
  unit?: string;
}
