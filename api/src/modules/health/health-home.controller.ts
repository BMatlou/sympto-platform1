import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthHomeService } from './health-home.service';
import { PatientContextService } from './patient-context.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

@ApiTags('Health Home')
@ApiBearerAuth()
@Controller('health-home')
@UseGuards(JwtAuthGuard)
export class HealthHomeController {
  constructor(
    private readonly healthHomeService: HealthHomeService,
    private readonly patientContextService: PatientContextService,
  ) {}

  @Get()
  async get(
    @Req() request: AuthenticatedRequest,
    @Query('patientId') patientId?: string,
  ) {
    const userId = await this.patientContextService.resolvePatientUserId(request.user.sub, patientId, 'VIEW_RECORDS');
    return this.healthHomeService.getForUser(userId);
  }

  @Get('records')
  async getClinicalRecords(
    @Req() request: AuthenticatedRequest,
    @Query('patientId') patientId?: string,
  ) {
    const userId = await this.patientContextService.resolvePatientUserId(request.user.sub, patientId, 'VIEW_RECORDS');
    return this.healthHomeService.getClinicalRecordsForUser(userId);
  }

  @Post('weight')
  async updateWeight(
    @Req() request: AuthenticatedRequest,
    @Query('patientId') patientId: string | undefined,
    @Body() body: { weightKg?: number | string; heightCm?: number | string },
  ) {
    const userId = await this.patientContextService.resolvePatientUserId(request.user.sub, patientId, 'VIEW_RECORDS');
    if (patientId && userId !== request.user.sub) {
      throw new BadRequestException('Family health records are read-only. The family member must update their own weight.');
    }
    const weightKg = Number(body?.weightKg);
    const heightCm = body?.heightCm === undefined || body?.heightCm === null || body?.heightCm === '' ? undefined : Number(body.heightCm);
    if (!Number.isFinite(weightKg)) throw new BadRequestException('Please provide a valid weight in kilograms.');
    if (heightCm !== undefined && !Number.isFinite(heightCm)) throw new BadRequestException('Please provide a valid height in centimetres.');
    return this.healthHomeService.updateWeight(userId, weightKg, heightCm);
  }
}
