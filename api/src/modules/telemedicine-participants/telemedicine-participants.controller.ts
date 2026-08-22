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

import { TelemedicineParticipantsService } from './telemedicine-participants.service';

import { CreateTelemedicineParticipantDto } from './dto/create-telemedicine-participant.dto';
import { UpdateTelemedicineParticipantDto } from './dto/update-telemedicine-participant.dto';
import { QueryTelemedicineParticipantDto } from './dto/query-telemedicine-participant.dto';

@ApiTags('Telemedicine Participants')
@ApiBearerAuth()
@Controller('telemedicine-participants')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class TelemedicineParticipantsController {
  constructor(
    private readonly telemedicineParticipantsService: TelemedicineParticipantsService,
  ) {}

  @Permissions(
    'telemedicine-participant.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateTelemedicineParticipantDto,
  ) {
    return this.telemedicineParticipantsService.create(
      dto,
    );
  }

  @Permissions(
    'telemedicine-participant.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryTelemedicineParticipantDto,
  ) {
    return this.telemedicineParticipantsService.findAll(
      query,
    );
  }

  @Permissions(
    'telemedicine-participant.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.telemedicineParticipantsService.findOne(
      id,
    );
  }

  @Permissions(
    'telemedicine-participant.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateTelemedicineParticipantDto,
  ) {
    return this.telemedicineParticipantsService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'telemedicine-participant.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.telemedicineParticipantsService.remove(
      id,
    );
  }
}