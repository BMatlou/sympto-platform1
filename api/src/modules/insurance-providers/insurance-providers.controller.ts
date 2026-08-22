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

import { InsuranceProvidersService } from './insurance-providers.service';

import { CreateInsuranceProviderDto } from './dto/create-insurance-provider.dto';
import { UpdateInsuranceProviderDto } from './dto/update-insurance-provider.dto';
import { QueryInsuranceProviderDto } from './dto/query-insurance-provider.dto';

@ApiTags('Insurance Providers')
@ApiBearerAuth()
@Controller('insurance-providers')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class InsuranceProvidersController {
  constructor(
    private readonly insuranceProvidersService: InsuranceProvidersService,
  ) {}

  @Permissions('insurance-providers.create')
  @Post()
  create(
    @Body() dto: CreateInsuranceProviderDto,
  ) {
    return this.insuranceProvidersService.create(
      dto,
    );
  }

  @Permissions('insurance-providers.read')
  @Get()
  findAll(
    @Query() query: QueryInsuranceProviderDto,
  ) {
    return this.insuranceProvidersService.findAll(
      query,
    );
  }

  @Permissions('insurance-providers.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.insuranceProvidersService.findOne(
      id,
    );
  }

  @Permissions('insurance-providers.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInsuranceProviderDto,
  ) {
    return this.insuranceProvidersService.update(
      id,
      dto,
    );
  }

  @Permissions('insurance-providers.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.insuranceProvidersService.remove(
      id,
    );
  }
}