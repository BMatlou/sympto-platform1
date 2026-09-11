import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional } from 'class-validator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyJournalService } from './daily-journal.service';
import { HealthHomeService } from './health-home.service';

class UpdateWeightDto {
  @IsNumber()
  weightKg!: number;

  @IsOptional()
  @IsNumber()
  heightCm?: number;
}

class RecordManualVitalsDto {
  @IsOptional() @IsNumber() systolicPressure?: number;
  @IsOptional() @IsNumber() diastolicPressure?: number;
  @IsOptional() @IsNumber() restingHeartRate?: number;
  @IsOptional() @IsNumber() respiratoryRate?: number;
  @IsOptional() @IsNumber() oxygenSaturation?: number;
  @IsOptional() @IsNumber() bodyTemperature?: number;
  @IsOptional() @IsNumber() weightKg?: number;
  @IsOptional() @IsNumber() heightCm?: number;
  @IsOptional() @IsDateString() measuredAt?: string;
}

@ApiTags('Health Home')
@ApiBearerAuth()
@Controller('health-home')
@UseGuards(JwtAuthGuard)
export class HealthHomeController {
  constructor(
    private readonly healthHomeService: HealthHomeService,
    private readonly dailyJournalService: DailyJournalService,
  ) {}

  @Get()
  getHealthHome(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.healthHomeService.getHealthHome(req.user.sub, patientId);
  }

  @Post('weight')
  updateWeight(@Req() req: any, @Query('patientId') patientId: string | undefined, @Body() dto: UpdateWeightDto) {
    return this.healthHomeService.updateWeight(req.user.sub, dto.weightKg, dto.heightCm, patientId);
  }

  @Post('manual-vitals')
  recordManualVitals(@Req() req: any, @Query('patientId') patientId: string | undefined, @Body() dto: RecordManualVitalsDto) {
    return this.healthHomeService.recordManualVitals(req.user.sub, dto, patientId);
  }

  @Post('journal/generate')
  generateJournal(@Req() req: any) {
    return this.dailyJournalService.generate(req.user.sub);
  }
}
