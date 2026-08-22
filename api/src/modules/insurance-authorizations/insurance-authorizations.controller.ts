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

import { InsuranceAuthorizationsService } from './insurance-authorizations.service';

import { CreateInsuranceAuthorizationDto } from './dto/create-insurance-authorization.dto';
import { QueryInsuranceAuthorizationDto } from './dto/query-insurance-authorization.dto';
import { UpdateInsuranceAuthorizationDto } from './dto/update-insurance-authorization.dto';

@ApiTags('Insurance Authorizations')
@ApiBearerAuth()
@Controller('insurance-authorizations')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class InsuranceAuthorizationsController {
  constructor(
    private readonly insuranceAuthorizationsService: InsuranceAuthorizationsService,
  ) {}

  @Permissions('insurance-authorizations.create')
  @Post()
  create(
    @Body() dto: CreateInsuranceAuthorizationDto,
  ) {
    return this.insuranceAuthorizationsService.create(dto);
  }

  @Permissions('insurance-authorizations.read')
  @Get()
  findAll(
    @Query() query: QueryInsuranceAuthorizationDto,
  ) {
    return this.insuranceAuthorizationsService.findAll(query);
  }

  @Permissions('insurance-authorizations.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.insuranceAuthorizationsService.findOne(id);
  }

  @Permissions('insurance-authorizations.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInsuranceAuthorizationDto,
  ) {
    return this.insuranceAuthorizationsService.update(
      id,
      dto,
    );
  }

  @Permissions('insurance-authorizations.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.insuranceAuthorizationsService.remove(id);
  }
}