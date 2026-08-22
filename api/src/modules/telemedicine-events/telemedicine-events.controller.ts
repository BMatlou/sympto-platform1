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

import { TelemedicineEventsService } from './telemedicine-events.service';

import { CreateTelemedicineEventDto } from './dto/create-telemedicine-event.dto';
import { UpdateTelemedicineEventDto } from './dto/update-telemedicine-event.dto';
import { QueryTelemedicineEventDto } from './dto/query-telemedicine-event.dto';

@ApiTags('Telemedicine Events')
@ApiBearerAuth()
@Controller('telemedicine-events')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class TelemedicineEventsController {
  constructor(
    private readonly telemedicineEventsService: TelemedicineEventsService,
  ) {}

  @Permissions(
    'telemedicine-event.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateTelemedicineEventDto,
  ) {
    return this.telemedicineEventsService.create(
      dto,
    );
  }

  @Permissions(
    'telemedicine-event.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryTelemedicineEventDto,
  ) {
    return this.telemedicineEventsService.findAll(
      query,
    );
  }

  @Permissions(
    'telemedicine-event.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.telemedicineEventsService.findOne(
      id,
    );
  }

  @Permissions(
    'telemedicine-event.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateTelemedicineEventDto,
  ) {
    return this.telemedicineEventsService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'telemedicine-event.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.telemedicineEventsService.remove(
      id,
    );
  }
}