import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyJournalService } from './daily-journal.service';
import { HealthHomeService } from './health-home.service';

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
  getHealthHome(@Req() req: any) {
    return this.healthHomeService.getHealthHome(req.user.sub);
  }

  @Post('journal/generate')
  generateJournal(@Req() req: any) {
    return this.dailyJournalService.generate(req.user.sub);
  }
}
