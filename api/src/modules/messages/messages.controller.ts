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
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';

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
    @Req() req: Request,
  ) {
    const user = req.user as JwtUser;
    return this.messagesService.create(dto, user.sub);
  }

  @Permissions('message.read')
  @Get()
  findAll(
    @Query() query: QueryMessageDto,
    @Req() req: Request,
  ) {
    const user = req.user as JwtUser;
    return this.messagesService.findAll(query, user.sub);
  }

  @Permissions('message.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtUser;
    return this.messagesService.findOne(id, user.sub);
  }

  @Permissions('message.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
    @Req() req: Request,
  ) {
    const user = req.user as JwtUser;
    return this.messagesService.update(id, dto, user.sub);
  }

  @Permissions('message.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtUser;
    return this.messagesService.remove(id, user.sub);
  }
}
