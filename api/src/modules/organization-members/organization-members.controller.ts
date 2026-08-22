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

import { OrganizationMembersService } from './organization-members.service';

import { CreateOrganizationMemberDto } from './dto/create-organization-member.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { QueryOrganizationMemberDto } from './dto/query-organization-member.dto';

@ApiTags('Organization Members')
@ApiBearerAuth()
@Controller('organization-members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationMembersController {
  constructor(
    private readonly organizationMembersService: OrganizationMembersService,
  ) {}

  @Permissions('organization-member.create')
  @Post()
  create(
    @Body() dto: CreateOrganizationMemberDto,
  ) {
    return this.organizationMembersService.create(
      dto,
    );
  }

  @Permissions('organization-member.read')
  @Get()
  findAll(
    @Query() query: QueryOrganizationMemberDto,
  ) {
    return this.organizationMembersService.findAll(
      query,
    );
  }

  @Permissions('organization-member.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.organizationMembersService.findOne(
      id,
    );
  }

  @Permissions('organization-member.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    return this.organizationMembersService.update(
      id,
      dto,
    );
  }

  @Permissions('organization-member.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.organizationMembersService.remove(
      id,
    );
  }
}