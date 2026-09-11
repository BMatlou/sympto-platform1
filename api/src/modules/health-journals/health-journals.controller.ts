import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { HealthJournalsService } from './health-journals.service';
import { SymptomIntelligenceService } from './symptom-intelligence.service';

import { CreateHealthJournalDto } from './dto/create-health-journal.dto';
import { UpdateHealthJournalDto } from './dto/update-health-journal.dto';
import { QueryHealthJournalDto } from './dto/query-health-journal.dto';
import { ProcessSymptomDto } from './dto/process-symptom.dto';
import { TalkToSymptoDto } from './dto/talk-to-sympto.dto';

@ApiTags('Health Journals')
@ApiBearerAuth()
@Controller('health-journals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthJournalsController {
  constructor(
    private readonly healthJournalsService: HealthJournalsService,
    private readonly symptomIntelligenceService: SymptomIntelligenceService,
  ) {}

  @Permissions('health-journals.create')
  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateHealthJournalDto,
  ) {
    return this.healthJournalsService.create(
      req.user.sub,
      dto,
    );
  }

  @Permissions('health-journals.create')
  @Post('process-symptom')
  processSymptom(
    @Req() req: any,
    @Body() dto: ProcessSymptomDto,
  ) {
    return this.symptomIntelligenceService.processSymptomLog(
      req.user.sub,
      dto,
    );
  }

  @Permissions('health-journals.create')
  @Post('talk-to-sympto')
  async talkToSympto(
    @Req() req: any,
    @Body() dto: TalkToSymptoDto,
  ) {
    const journal = await this.healthJournalsService.create(
      req.user.sub,
      {
        title: 'Talk to Sympto — health update',
        journal: dto.message.trim(),
        notes: 'Captured through Talk to Sympto.',
      },
    );

    const intelligence = await this.symptomIntelligenceService.analyzeTalkUpdate(
      req.user.sub,
      dto.message,
    );

    return {
      journal,
      intelligence,
    };
  }

  @Permissions('health-journals.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query() query: QueryHealthJournalDto,
  ) {
    return this.healthJournalsService.findAll(
      req.user.sub,
      query,
    );
  }

  @Permissions('health-journals.read')
  @Get(':id')
  findOne(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.healthJournalsService.findOne(
      req.user.sub,
      id,
    );
  }

  @Permissions('health-journals.update')
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateHealthJournalDto,
  ) {
    return this.healthJournalsService.update(
      req.user.sub,
      id,
      dto,
    );
  }

  @Permissions('health-journals.delete')
  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.healthJournalsService.remove(
      req.user.sub,
      id,
    );
  }
}
