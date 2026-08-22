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

import { FinancialAdjustmentsService } from './financial-adjustments.service';

import { CreateFinancialAdjustmentDto } from './dto/create-financial-adjustment.dto';
import { UpdateFinancialAdjustmentDto } from './dto/update-financial-adjustment.dto';
import { QueryFinancialAdjustmentDto } from './dto/query-financial-adjustment.dto';

@ApiTags('Financial Adjustments')
@ApiBearerAuth()
@Controller('financial-adjustments')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class FinancialAdjustmentsController {
  constructor(
    private readonly financialAdjustmentsService: FinancialAdjustmentsService,
  ) {}

  @Permissions('financial-adjustments.create')
  @Post()
  create(
    @Body() dto: CreateFinancialAdjustmentDto,
  ) {
    return this.financialAdjustmentsService.create(dto);
  }

  @Permissions('financial-adjustments.read')
  @Get()
  findAll(
    @Query() query: QueryFinancialAdjustmentDto,
  ) {
    return this.financialAdjustmentsService.findAll(query);
  }

  @Permissions('financial-adjustments.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.financialAdjustmentsService.findOne(id);
  }

  @Permissions('financial-adjustments.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFinancialAdjustmentDto,
  ) {
    return this.financialAdjustmentsService.update(
      id,
      dto,
    );
  }

  @Permissions('financial-adjustments.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.financialAdjustmentsService.remove(id);
  }
}