import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';

@ApiTags('Sensors')
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @ApiOperation({ summary: 'List all active sensors (paginated + search)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'DTH' })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.sensorsService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
    });
  }

  @ApiOperation({ summary: 'Get sensor by ID' })
  @ApiParam({ name: 'id', type: Number })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sensorsService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new sensor' })
  @ApiBody({ type: CreateSensorDto })
  @Post()
  create(@Body() dto: CreateSensorDto) {
    return this.sensorsService.create(dto);
  }

  @ApiOperation({ summary: 'Soft delete a sensor' })
  @ApiParam({ name: 'id', type: Number })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.sensorsService.softDelete(id);
  }
}
