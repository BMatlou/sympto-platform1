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

import { DebitNotesService } from './debit-notes.service';

import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { UpdateDebitNoteDto } from './dto/update-debit-note.dto';
import { QueryDebitNoteDto } from './dto/query-debit-note.dto';

@ApiTags('Debit Notes')
@ApiBearerAuth()
@Controller('debit-notes')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class DebitNotesController {
  constructor(
    private readonly debitNotesService: DebitNotesService,
  ) {}

  @Permissions('debit-notes.create')
  @Post()
  create(
    @Body() dto: CreateDebitNoteDto,
  ) {
    return this.debitNotesService.create(dto);
  }

  @Permissions('debit-notes.read')
  @Get()
  findAll(
    @Query() query: QueryDebitNoteDto,
  ) {
    return this.debitNotesService.findAll(query);
  }

  @Permissions('debit-notes.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.debitNotesService.findOne(id);
  }

  @Permissions('debit-notes.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDebitNoteDto,
  ) {
    return this.debitNotesService.update(
      id,
      dto,
    );
  }

  @Permissions('debit-notes.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.debitNotesService.remove(id);
  }
}