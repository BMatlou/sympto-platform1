import { Body, Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { IsEnum } from 'class-validator';

import { CarePlanTaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CarePlanTasksService } from './care-plan-tasks.service';

class UpdatePatientCarePlanTaskStatusDto {
  @IsEnum(CarePlanTaskStatus)
  status!: CarePlanTaskStatus;
}

@Controller('patient-care-plan-tasks')
@UseGuards(JwtAuthGuard)
export class PatientCarePlanTasksController {
  constructor(private readonly carePlanTasksService: CarePlanTasksService) {}

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePatientCarePlanTaskStatusDto,
  ) {
    if (dto.status === 'CANCELLED') {
      return this.carePlanTasksService.updateStatusForPatient(
        req.user.sub,
        id,
        'COMPLETED' as const,
      );
    }

    return this.carePlanTasksService.updateStatusForPatient(
      req.user.sub,
      id,
      dto.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
    );
  }
}
