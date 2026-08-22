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

import { EmergencyContactsService } from './emergency-contacts.service';

import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { QueryEmergencyContactDto } from './dto/query-emergency-contact.dto';

@ApiTags('Emergency Contacts')
@ApiBearerAuth()
@Controller('emergency-contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmergencyContactsController {
  constructor(
    private readonly emergencyContactsService: EmergencyContactsService,
  ) {}

  @Permissions('emergency-contact.create')
  @Post()
  create(@Body() dto: CreateEmergencyContactDto) {
    return this.emergencyContactsService.create(dto);
  }

  @Permissions('emergency-contact.read')
  @Get()
  findAll(@Query() query: QueryEmergencyContactDto) {
    return this.emergencyContactsService.findAll(query);
  }

  @Permissions('emergency-contact.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emergencyContactsService.findOne(id);
  }

  @Permissions('emergency-contact.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmergencyContactDto,
  ) {
    return this.emergencyContactsService.update(id, dto);
  }

  @Permissions('emergency-contact.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emergencyContactsService.remove(id);
  }
}