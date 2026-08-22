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

import { MessagesService } from './messages.service';

import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { QueryMessageDto } from './dto/query-message.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
  ) {}

  @Permissions('message.create')
  @Post()
  create(
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(dto);
  }

  @Permissions('message.read')
  @Get()
  findAll(
    @Query() query: QueryMessageDto,
  ) {
    return this.messagesService.findAll(query);
  }

  @Permissions('message.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.messagesService.findOne(id);
  }

  @Permissions('message.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.update(
      id,
      dto,
    );
  }

  @Permissions('message.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.messagesService.remove(id);
  }
}