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

import { InsurancePoliciesService } from './insurance-policies.service';

import { CreateInsurancePolicyDto } from './dto/create-insurance-policy.dto';
import { UpdateInsurancePolicyDto } from './dto/update-insurance-policy.dto';
import { QueryInsurancePolicyDto } from './dto/query-insurance-policy.dto';

@ApiTags('Insurance Policies')
@ApiBearerAuth()
@Controller('insurance-policies')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class InsurancePoliciesController {
  constructor(
    private readonly insurancePoliciesService: InsurancePoliciesService,
  ) {}

  @Permissions('insurance-policies.create')
  @Post()
  create(
    @Body() dto: CreateInsurancePolicyDto,
  ) {
    return this.insurancePoliciesService.create(
      dto,
    );
  }

  @Permissions('insurance-policies.read')
  @Get()
  findAll(
    @Query() query: QueryInsurancePolicyDto,
  ) {
    return this.insurancePoliciesService.findAll(
      query,
    );
  }

  @Permissions('insurance-policies.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.insurancePoliciesService.findOne(
      id,
    );
  }

  @Permissions('insurance-policies.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInsurancePolicyDto,
  ) {
    return this.insurancePoliciesService.update(
      id,
      dto,
    );
  }

  @Permissions('insurance-policies.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.insurancePoliciesService.remove(
      id,
    );
  }
}