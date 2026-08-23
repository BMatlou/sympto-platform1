import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { MedicationAdherenceService } from './medication-adherence.service';
import { MedicationAdherenceGoalService } from './medication-adherence-goal.service';
import { RecordMedicationAdherenceDto } from './dto/record-medication-adherence.dto';
import { CreateAdherenceGoalDto } from './dto/create-adherence-goal.dto';

@ApiTags('Medication Adherence')
@ApiBearerAuth()
@Controller('medication-adherence')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MedicationAdherenceController {
  constructor(private readonly service: MedicationAdherenceService, private readonly goalService: MedicationAdherenceGoalService) {}

  @Permissions('medications.read')
  @Post()
  record(@Req() req: any, @Body() dto: RecordMedicationAdherenceDto) { return this.service.record(req.user.sub, dto); }

  @Permissions('medications.read')
  @Get('summary')
  summary(@Req() req: any, @Query('days') days?: string) {
    const parsed = Number(days ?? 30);
    return this.service.summary(req.user.sub, Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : 30);
  }

  @Permissions('health-goals.create')
  @Post('goals')
  createGoal(@Req() req: any, @Body() dto: CreateAdherenceGoalDto) { return this.goalService.create(req.user.sub, dto); }

  @Permissions('health-goals.read')
  @Get('goals')
  listGoals(@Req() req: any) { return this.goalService.list(req.user.sub); }
}
