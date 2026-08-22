import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { HealthPassportsService } from './health-passports.service';

import { CreateHealthPassportDto } from './dto/create-health-passport.dto';
import { UpdateHealthPassportDto } from './dto/update-health-passport.dto';
import { QueryHealthPassportDto } from './dto/query-health-passport.dto';

@ApiTags('Health Passports')
@ApiBearerAuth()
@Controller('health-passports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthPassportsController {
  constructor(
    private readonly healthPassportsService: HealthPassportsService,
  ) {}

  @Permissions('health-passport.create')
  @Post()
  create(@Body() dto: CreateHealthPassportDto) {
    return this.healthPassportsService.create(dto);
  }

  @Permissions('health-passport.read')
  @Get()
  findAll(@Query() query: QueryHealthPassportDto) {
    return this.healthPassportsService.findAll(query);
  }

  @Permissions('health-passport.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.healthPassportsService.findOne(id);
  }

  @Permissions('health-passport.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHealthPassportDto,
  ) {
    return this.healthPassportsService.update(id, dto);
  }

  @Permissions('health-passport.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.healthPassportsService.remove(id);
  }
}