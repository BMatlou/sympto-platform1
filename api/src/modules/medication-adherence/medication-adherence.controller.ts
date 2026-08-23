import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { MedicationAdherenceService } from './medication-adherence.service';
import { RecordMedicationAdherenceDto } from './dto/record-medication-adherence.dto';

@ApiTags('Medication Adherence')
@ApiBearerAuth()
@Controller('medication-adherence')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MedicationAdherenceController {
  constructor(private readonly service: MedicationAdherenceService) {}

  @Permissions('medications.read')
  @Post()
  record(@Req() req: any, @Body() dto: RecordMedicationAdherenceDto) {
    return this.service.record(req.user.sub, dto);
  }

  @Permissions('medications.read')
  @Get('summary')
  summary(@Req() req: any, @Query('days') days?: string) {
    const parsed = Number(days ?? 30);
    return this.service.summary(req.user.sub, Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : 30);
  }
}
