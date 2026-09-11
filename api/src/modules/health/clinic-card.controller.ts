import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicCardService } from './clinic-card.service';
import { ClinicCardProfileService, UpdateClinicCardProfileInput } from './clinic-card-profile.service';
import { PatientContextService } from './patient-context.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

@ApiTags('Clinic Card')
@ApiBearerAuth()
@Controller('clinic-card')
@UseGuards(JwtAuthGuard)
export class ClinicCardController {
  constructor(
    private readonly clinicCardService: ClinicCardService,
    private readonly clinicCardProfileService: ClinicCardProfileService,
    private readonly patientContextService: PatientContextService,
  ) {}

  @Get()
  async get(@Req() request: AuthenticatedRequest) {
    const userId = await this.patientContextService.resolvePatientUserId(request.user.sub, undefined, 'VIEW_RECORDS');
    return this.clinicCardService.getForUser(userId);
  }

  @Patch('profile')
  async updateProfile(@Req() request: AuthenticatedRequest, @Body() body: UpdateClinicCardProfileInput) {
    const userId = await this.patientContextService.resolvePatientUserId(request.user.sub, undefined, 'VIEW_RECORDS');
    return this.clinicCardProfileService.update(userId, body);
  }
}
