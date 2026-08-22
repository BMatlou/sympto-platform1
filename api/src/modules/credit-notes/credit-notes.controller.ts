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

import { CreditNotesService } from './credit-notes.service';

import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { UpdateCreditNoteDto } from './dto/update-credit-note.dto';
import { QueryCreditNoteDto } from './dto/query-credit-note.dto';

@ApiTags('Credit Notes')
@ApiBearerAuth()
@Controller('credit-notes')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class CreditNotesController {
  constructor(
    private readonly creditNotesService: CreditNotesService,
  ) {}

  @Permissions('credit-notes.create')
  @Post()
  create(
    @Body() dto: CreateCreditNoteDto,
  ) {
    return this.creditNotesService.create(
      dto,
    );
  }

  @Permissions('credit-notes.read')
  @Get()
  findAll(
    @Query() query: QueryCreditNoteDto,
  ) {
    return this.creditNotesService.findAll(
      query,
    );
  }

  @Permissions('credit-notes.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.creditNotesService.findOne(
      id,
    );
  }

  @Permissions('credit-notes.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCreditNoteDto,
  ) {
    return this.creditNotesService.update(
      id,
      dto,
    );
  }

  @Permissions('credit-notes.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.creditNotesService.remove(
      id,
    );
  }
}