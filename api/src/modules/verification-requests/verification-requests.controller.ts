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

import { VerificationRequestsService } from './verification-requests.service';

import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';
import { UpdateVerificationRequestDto } from './dto/update-verification-request.dto';
import { QueryVerificationRequestDto } from './dto/query-verification-request.dto';

@ApiTags('Verification Requests')
@ApiBearerAuth()
@Controller('verification-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VerificationRequestsController {
  constructor(
    private readonly verificationRequestsService: VerificationRequestsService,
  ) {}

  @Permissions('verification-request.create')
  @Post()
  create(@Body() dto: CreateVerificationRequestDto) {
    return this.verificationRequestsService.create(dto);
  }

  @Permissions('verification-request.read')
  @Get()
  findAll(@Query() query: QueryVerificationRequestDto) {
    return this.verificationRequestsService.findAll(query);
  }

  @Permissions('verification-request.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.verificationRequestsService.findOne(id);
  }

  @Permissions('verification-request.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVerificationRequestDto,
  ) {
    return this.verificationRequestsService.update(id, dto);
  }

  @Permissions('verification-request.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.verificationRequestsService.remove(id);
  }
}