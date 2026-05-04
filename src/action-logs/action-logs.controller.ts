import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ActionLogsService } from './action-logs.service';

@ApiTags('Action Logs')
@Controller('action-logs')
export class ActionLogsController {
  constructor(private readonly actionLogsService: ActionLogsService) {}

  @ApiOperation({ summary: 'Get ON/OFF action count statistics per device' })
  @Get('stats')
  async getStats() {
    return this.actionLogsService.getStats();
  }

  @ApiOperation({ summary: 'Query action logs with filters' })
  @ApiQuery({ name: 'deviceId', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, enum: ['ON', 'OFF'] })
  @ApiQuery({ name: 'executionStatus', required: false, enum: ['PROCESSING', 'SUCCESS', 'FAILURE'] })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2026-03-28', description: 'Partial match: "2026-03-28" or "2026-03-28 12:51"' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort by createdAt' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @Get()
  async query(
    @Query('deviceId') deviceId?: string,
    @Query('action') action?: string,
    @Query('executionStatus') executionStatus?: string,
    @Query('date') date?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.actionLogsService.query({
      deviceId: deviceId ? parseInt(deviceId) : undefined,
      action,
      executionStatus,
      date,
      sortOrder: (sortOrder === 'ASC' || sortOrder === 'DESC') ? sortOrder : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @ApiOperation({ summary: 'Get all action logs for a specific device' })
  @ApiParam({ name: 'deviceId', type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @Get('device/:deviceId')
  async getByDevice(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.actionLogsService.getByDevice(
      deviceId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }
}
