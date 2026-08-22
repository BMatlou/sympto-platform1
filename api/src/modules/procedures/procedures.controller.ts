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

import { ProceduresService } from './procedures.service';

import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { QueryProcedureDto } from './dto/query-procedure.dto';

@ApiTags('Procedures')
@ApiBearerAuth()
@Controller('procedures')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProceduresController {
  constructor(
    private readonly proceduresService: ProceduresService,
  ) {}

  @Permissions('procedure.create')
  @Post()
  create(@Body() dto: CreateProcedureDto) {
    return this.proceduresService.create(dto);
  }

  @Permissions('procedure.read')
  @Get()
  findAll(@Query() query: QueryProcedureDto) {
    return this.proceduresService.findAll(query);
  }

  @Permissions('procedure.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proceduresService.findOne(id);
  }

  @Permissions('procedure.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProcedureDto,
  ) {
    return this.proceduresService.update(id, dto);
  }

  @Permissions('procedure.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proceduresService.remove(id);
  }
}