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

import { DepartmentsService } from './departments.service';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Permissions('department.create')
  @Post()
  create(
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(dto);
  }

  @Permissions('department.read')
  @Get()
  findAll(
    @Query() query: QueryDepartmentDto,
  ) {
    return this.departmentsService.findAll(query);
  }

  @Permissions('department.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.departmentsService.findOne(id);
  }

  @Permissions('department.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(
      id,
      dto,
    );
  }

  @Permissions('department.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.departmentsService.remove(id);
  }
}