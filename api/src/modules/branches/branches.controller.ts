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

import { BranchesService } from './branches.service';

import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { QueryBranchDto } from './dto/query-branch.dto';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
  ) {}

  @Permissions('branch.create')
  @Post()
  create(
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchesService.create(dto);
  }

  @Permissions('branch.read')
  @Get()
  findAll(
    @Query() query: QueryBranchDto,
  ) {
    return this.branchesService.findAll(query);
  }

  @Permissions('branch.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.branchesService.findOne(id);
  }

  @Permissions('branch.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(
      id,
      dto,
    );
  }

  @Permissions('branch.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.branchesService.remove(id);
  }
}