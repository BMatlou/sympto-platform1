import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { FamilyService } from './family.service';

import { LinkFamilyMemberDto } from './dto/link-family-member.dto';

@ApiTags('Family')
@ApiBearerAuth()
@Controller('family')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
  ) {}

  @Permissions('patients.update')
  @Post('link')
  link(
    @Body() dto: LinkFamilyMemberDto,
  ) {
    return this.familyService.link(dto);
  }

  @Permissions('patients.read')
  @Get(':ownerPatientId')
  list(
    @Param('ownerPatientId')
    ownerPatientId: string,
  ) {
    return this.familyService.list(ownerPatientId);
  }

  @Permissions('patients.update')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.familyService.remove(id);
  }
}