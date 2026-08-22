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

import { TelemedicineConsentsService } from './telemedicine-consents.service';

import { CreateTelemedicineConsentDto } from './dto/create-telemedicine-consent.dto';
import { UpdateTelemedicineConsentDto } from './dto/update-telemedicine-consent.dto';
import { QueryTelemedicineConsentDto } from './dto/query-telemedicine-consent.dto';

@ApiTags('Telemedicine Consents')
@ApiBearerAuth()
@Controller('telemedicine-consents')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class TelemedicineConsentsController {
  constructor(
    private readonly telemedicineConsentsService: TelemedicineConsentsService,
  ) {}

  @Permissions(
    'telemedicine-consent.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateTelemedicineConsentDto,
  ) {
    return this.telemedicineConsentsService.create(
      dto,
    );
  }

  @Permissions(
    'telemedicine-consent.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryTelemedicineConsentDto,
  ) {
    return this.telemedicineConsentsService.findAll(
      query,
    );
  }

  @Permissions(
    'telemedicine-consent.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.telemedicineConsentsService.findOne(
      id,
    );
  }

  @Permissions(
    'telemedicine-consent.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateTelemedicineConsentDto,
  ) {
    return this.telemedicineConsentsService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'telemedicine-consent.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.telemedicineConsentsService.remove(
      id,
    );
  }
}