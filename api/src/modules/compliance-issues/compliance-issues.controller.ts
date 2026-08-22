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

import { ComplianceIssuesService } from './compliance-issues.service';

import { CreateComplianceIssueDto } from './dto/create-compliance-issue.dto';
import { UpdateComplianceIssueDto } from './dto/update-compliance-issue.dto';
import { QueryComplianceIssueDto } from './dto/query-compliance-issue.dto';

@ApiTags('Compliance Issues')
@ApiBearerAuth()
@Controller('compliance-issues')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ComplianceIssuesController {
  constructor(
    private readonly complianceIssuesService: ComplianceIssuesService,
  ) {}

  @Permissions('compliance-issue.create')
  @Post()
  create(
    @Body()
    dto: CreateComplianceIssueDto,
  ) {
    return this.complianceIssuesService.create(dto);
  }

  @Permissions('compliance-issue.read')
  @Get()
  findAll(
    @Query()
    query: QueryComplianceIssueDto,
  ) {
    return this.complianceIssuesService.findAll(query);
  }

  @Permissions('compliance-issue.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.complianceIssuesService.findOne(id);
  }

  @Permissions('compliance-issue.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateComplianceIssueDto,
  ) {
    return this.complianceIssuesService.update(
      id,
      dto,
    );
  }

  @Permissions('compliance-issue.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.complianceIssuesService.remove(id);
  }
}