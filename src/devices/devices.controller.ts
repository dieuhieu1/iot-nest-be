import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ControlDeviceDto } from './dto/control-device.dto';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @ApiOperation({ summary: 'List all active devices' })
  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  @ApiOperation({ summary: 'Get device by ID' })
  @ApiParam({ name: 'id', type: Number })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new device' })
  @ApiBody({ type: CreateDeviceDto })
  @Post()
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

  @ApiOperation({ summary: 'Send ON/OFF command to device' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: ControlDeviceDto })
  @ApiResponse({ status: 200, description: 'Returns { message, logId }' })
  @Patch(':id/control')
  control(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ControlDeviceDto,
  ) {
    return this.devicesService.control(id, dto);
  }

  @ApiOperation({ summary: 'Soft delete a device' })
  @ApiParam({ name: 'id', type: Number })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.softDelete(id);
  }
}
