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

import { PersonsService } from './persons.service';

import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { QueryPersonDto } from './dto/query-person.dto';

@ApiTags('Persons')
@ApiBearerAuth()
@Controller('persons')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PersonsController {
  constructor(
    private readonly personsService: PersonsService,
  ) {}

  @Permissions('person.create')
  @Post()
  create(
    @Body() dto: CreatePersonDto,
  ) {
    return this.personsService.create(dto);
  }

  @Permissions('person.read')
  @Get()
  findAll(
    @Query() query: QueryPersonDto,
  ) {
    return this.personsService.findAll(query);
  }

  @Permissions('person.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.personsService.findOne(id);
  }

  @Permissions('person.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.personsService.update(id, dto);
  }

  @Permissions('person.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.personsService.remove(id);
  }
}