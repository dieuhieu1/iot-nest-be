import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get chart history per sensor (last N readings)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('charts')
  getCharts(@Query('limit') limit?: string) {
    return this.dashboardService.getChartData(limit ? parseInt(limit) : 20);
  }

  @ApiOperation({ summary: 'Get latest reading per sensor for dashboard cards' })
  @Get('latest')
  getLatest() {
    return this.dashboardService.getLatestReadings();
  }

  @ApiOperation({ summary: 'Get all active devices for device panel' })
  @Get('devices')
  getDevices() {
    return this.dashboardService.getDevicePanel();
  }
}
