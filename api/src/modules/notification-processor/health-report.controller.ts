import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthReportNotificationSchedulerService } from './health-report-notification-scheduler.service';

type AuthenticatedRequest = {
  user?: {
    id?: string;
    sub?: string;
    userType?: string;
  };
};

@Controller('health-reports')
@ApiTags('Health Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class HealthReportController {
  constructor(
    private readonly reportScheduler: HealthReportNotificationSchedulerService,
  ) {}

  @Get(':kind')
  getReport(
    @Req() req: AuthenticatedRequest,
    @Param('kind') kind: string,
    @Query('date') date?: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user ID is missing.');
    }

    const normalized = kind.trim().toUpperCase();
    if (normalized !== 'WEEKLY' && normalized !== 'MONTHLY') {
      throw new BadRequestException('Health report type must be weekly or monthly.');
    }

    return this.reportScheduler.getPatientReport(
      userId,
      normalized as 'WEEKLY' | 'MONTHLY',
      date,
    );
  }
}
