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

import { CreateHealthJournalDto } from './dto/create-health-journal.dto';
import { UpdateHealthJournalDto } from './dto/update-health-journal.dto';
import { QueryHealthJournalDto } from './dto/query-health-journal.dto';

@ApiTags('Health Journals')
@ApiBearerAuth()
@Controller('health-journals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthJournalsController {
  constructor(
    private readonly healthJournalsService: HealthJournalsService,
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