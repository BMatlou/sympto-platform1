import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { FamilyService } from './family.service';
import { LinkFamilyMemberDto } from './dto/link-family-member.dto';

type AuthenticatedRequest = Request & { user: { sub: string } };

@ApiTags('Family')
@ApiBearerAuth()
@Controller('family')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Permissions('patients.update')
  @Post('link')
  link(@Req() request: AuthenticatedRequest, @Body() dto: LinkFamilyMemberDto) {
    return this.familyService.linkForUser(request.user.sub, dto);
  }

  @Permissions('patients.read')
  @Get()
  listForUser(@Req() request: AuthenticatedRequest) {
    return this.familyService.listForUser(request.user.sub);
  }

  @Permissions('patients.read')
  @Get(':ownerPatientId')
  list(@Param('ownerPatientId') ownerPatientId: string) {
    return this.familyService.list(ownerPatientId);
  }

  @Permissions('patients.update')
  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.familyService.removeForUser(request.user.sub, id);
  }
}
