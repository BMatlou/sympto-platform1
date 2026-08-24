import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthHomeService } from './health-home.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

@ApiTags('Health Home')
@ApiBearerAuth()
@Controller('health-home')
@UseGuards(JwtAuthGuard)
export class HealthHomeController {
  constructor(private readonly healthHomeService: HealthHomeService) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.healthHomeService.getForUser(request.user.sub);
  }

  @Get('records')
  getClinicalRecords(@Req() request: AuthenticatedRequest) {
    return this.healthHomeService.getClinicalRecordsForUser(request.user.sub);
  }

  @Post('weight')
  updateWeight(
    @Req() request: AuthenticatedRequest,
    @Body() body: { weightKg?: number | string; heightCm?: number | string },
  ) {
    const weightKg = Number(body?.weightKg);
    const heightCm = body?.heightCm === undefined || body?.heightCm === null || body?.heightCm === '' ? undefined : Number(body.heightCm);
    if (!Number.isFinite(weightKg)) throw new BadRequestException('Please provide a valid weight in kilograms.');
    if (heightCm !== undefined && !Number.isFinite(heightCm)) throw new BadRequestException('Please provide a valid height in centimetres.');
    return this.healthHomeService.updateWeight(request.user.sub, weightKg, heightCm);
  }
}