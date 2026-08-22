import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CdsRulesService } from './cds-rules.service';

import { CreateCdsRuleDto } from './dto/create-cds-rule.dto';
import { UpdateCdsRuleDto } from './dto/update-cds-rule.dto';
import { QueryCdsRuleDto } from './dto/query-cds-rule.dto';

@ApiTags('Cds Rules')
@ApiBearerAuth()
@Controller('cds-rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CdsRulesController {
  constructor(
    private readonly cdsRulesService: CdsRulesService,
  ) {}

  @Permissions('cds.create')
  @Post()
  create(
    @Body() dto: CreateCdsRuleDto,
  ) {
    return this.cdsRulesService.create(dto);
  }

  @Permissions('cds.read')
  @Get()
  findAll(
    @Query() query: QueryCdsRuleDto,
  ) {
    return this.cdsRulesService.findAll(query);
  }

  @Permissions('cds.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.cdsRulesService.findOne(id);
  }

  @Permissions('cds.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCdsRuleDto,
  ) {
    return this.cdsRulesService.update(id, dto);
  }

  @Permissions('cds.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.cdsRulesService.remove(id);
  }
}