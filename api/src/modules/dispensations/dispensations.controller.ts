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

import { DispensationsService } from './dispensations.service';

import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { UpdateDispensationDto } from './dto/update-dispensation.dto';
import { QueryDispensationDto } from './dto/query-dispensation.dto';

@ApiTags('Dispensations')
@ApiBearerAuth()
@Controller('dispensations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DispensationsController {
  constructor(
    private readonly dispensationsService: DispensationsService,
  ) {}

  @Permissions('dispensation.create')
  @Post()
  create(@Body() dto: CreateDispensationDto) {
    return this.dispensationsService.create(dto);
  }

  @Permissions('dispensation.read')
  @Get()
  findAll(@Query() query: QueryDispensationDto) {
    return this.dispensationsService.findAll(query);
  }

  @Permissions('dispensation.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dispensationsService.findOne(id);
  }

  @Permissions('dispensation.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDispensationDto,
  ) {
    return this.dispensationsService.update(id, dto);
  }

  @Permissions('dispensation.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dispensationsService.remove(id);
  }
}