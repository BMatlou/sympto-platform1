import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyJournalService } from './daily-journal.service';
import { HealthHomeService } from './health-home.service';
import { UpdateHealthWeightDto } from './dto/update-health-weight.dto';

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

  @Get('timeline')
  getTimeline(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.healthHomeService.getTimeline(req.user.sub, patientId);
  }

  @Post('weight')
  updateWeight(
    @Req() req: any,
    @Body() dto: UpdateHealthWeightDto,
    @Query('patientId') patientId?: string,
  ) {
    return this.healthHomeService.updateWeight(req.user.sub, dto, patientId);
  }

  @Post('journal/generate')
  generateJournal(@Req() req: any) {
    return this.dailyJournalService.generate(req.user.sub);
  }
}
