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

import { ClaimsService } from './claims.service';

import { CreateClaimDto } from './dto/create-claim.dto';
import { QueryClaimDto } from './dto/query-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';

@ApiTags('Claims')
@ApiBearerAuth()
@Controller('claims')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ClaimsController {
  constructor(
    private readonly claimsService: ClaimsService,
  ) {}

  @Permissions('claims.create')
  @Post()
  create(
    @Body() dto: CreateClaimDto,
  ) {
    return this.claimsService.create(dto);
  }

  @Permissions('claims.read')
  @Get()
  findAll(
    @Query() query: QueryClaimDto,
  ) {
    return this.claimsService.findAll(query);
  }

  @Permissions('claims.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.claimsService.findOne(id);
  }

  @Permissions('claims.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClaimDto,
  ) {
    return this.claimsService.update(
      id,
      dto,
    );
  }

  @Permissions('claims.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.claimsService.remove(id);
  }
}