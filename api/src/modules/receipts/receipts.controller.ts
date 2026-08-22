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

import { ReceiptsService } from './receipts.service';

import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';

@ApiTags('Receipts')
@ApiBearerAuth()
@Controller('receipts')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
  ) {}

  @Permissions('receipts.create')
  @Post()
  create(
    @Body() dto: CreateReceiptDto,
  ) {
    return this.receiptsService.create(
      dto,
    );
  }

  @Permissions('receipts.read')
  @Get()
  findAll(
    @Query() query: QueryReceiptDto,
  ) {
    return this.receiptsService.findAll(
      query,
    );
  }

  @Permissions('receipts.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.receiptsService.findOne(
      id,
    );
  }

  @Permissions('receipts.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(
      id,
      dto,
    );
  }

  @Permissions('receipts.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.receiptsService.remove(
      id,
    );
  }
}