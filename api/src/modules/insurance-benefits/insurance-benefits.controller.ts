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

import { InsuranceBenefitsService } from './insurance-benefits.service';

import { CreateInsuranceBenefitDto } from './dto/create-insurance-benefit.dto';
import { UpdateInsuranceBenefitDto } from './dto/update-insurance-benefit.dto';
import { QueryInsuranceBenefitDto } from './dto/query-insurance-benefit.dto';

@ApiTags('Insurance Benefits')
@ApiBearerAuth()
@Controller('insurance-benefits')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class InsuranceBenefitsController {
  constructor(
    private readonly insuranceBenefitsService: InsuranceBenefitsService,
  ) {}

  @Permissions('insurance-benefits.create')
  @Post()
  create(
    @Body() dto: CreateInsuranceBenefitDto,
  ) {
    return this.insuranceBenefitsService.create(dto);
  }

  @Permissions('insurance-benefits.read')
  @Get()
  findAll(
    @Query() query: QueryInsuranceBenefitDto,
  ) {
    return this.insuranceBenefitsService.findAll(query);
  }

  @Permissions('insurance-benefits.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.insuranceBenefitsService.findOne(id);
  }

  @Permissions('insurance-benefits.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInsuranceBenefitDto,
  ) {
    return this.insuranceBenefitsService.update(
      id,
      dto,
    );
  }

  @Permissions('insurance-benefits.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.insuranceBenefitsService.remove(id);
  }
}