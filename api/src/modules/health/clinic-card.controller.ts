import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicCardService } from './clinic-card.service';
import { PatientContextService } from './patient-context.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

@ApiTags('Clinic Card')
@ApiBearerAuth()
@Controller('clinic-card')
@UseGuards(JwtAuthGuard)
export class ClinicCardController {
  constructor(
    private readonly clinicCardService: ClinicCardService,
    private readonly patientContextService: PatientContextService,
  ) {}

  @Get()
  async get(@Req() request: AuthenticatedRequest) {
    const userId = await this.patientContextService.resolvePatientUserId(request.user.sub, undefined, 'VIEW_RECORDS');
    return this.clinicCardService.getForUser(userId);
  }
}
