import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SensorDataService } from './sensor-data.service';

@ApiTags('Sensor Data')
@Controller('sensor-data')
export class SensorDataController {
  constructor(private readonly sensorDataService: SensorDataService) {}

  @ApiOperation({ summary: 'Query sensor readings' })
  @ApiQuery({ name: 'sensorId', required: false, type: Number })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2026-03-28', description: 'Partial match: "2026-03-28" or "2026-03-28 12:51"' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @Get()
  async query(
    @Query('sensorId') sensorId?: string,
    @Query('date') date?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.sensorDataService.query({
      sensorId: sensorId ? parseInt(sensorId) : undefined,
      date,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @ApiOperation({ summary: 'Get latest reading for a sensor' })
  @ApiParam({ name: 'sensorId', type: Number })
  @Get('sensor/:sensorId/latest')
  async getLatest(@Param('sensorId', ParseIntPipe) sensorId: number) {
    return this.sensorDataService.getLatestBySensor(sensorId);
  }
}
