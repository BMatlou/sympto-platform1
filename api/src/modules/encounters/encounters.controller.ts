import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { EncountersService } from './encounters.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { QueryEncounterDto } from './dto/query-encounter.dto';

@ApiTags('Encounters')
@ApiBearerAuth()
@Controller('encounters')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Permissions('encounters.create')
  @Post()
  create(@Req() req: any, @Body() dto: CreateEncounterDto) {
    return this.encountersService.create(dto, req.user.sub);
  }

  @Permissions('encounters.read')
  @Get()
  findAll(@Req() req: any, @Query() query: QueryEncounterDto) {
    return this.encountersService.findAll(query, req.user.sub);
  }

  @Permissions('encounters.read')
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.encountersService.findOne(id, req.user.sub);
  }

  @Permissions('encounters.update')
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEncounterDto) {
    return this.encountersService.update(id, dto, req.user.sub);
  }

  @Permissions('encounters.delete')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.encountersService.remove(id, req.user.sub);
  }
}
