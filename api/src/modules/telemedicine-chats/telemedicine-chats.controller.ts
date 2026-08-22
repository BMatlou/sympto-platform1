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

import { TelemedicineChatsService } from './telemedicine-chats.service';

import { CreateTelemedicineChatDto } from './dto/create-telemedicine-chat.dto';
import { UpdateTelemedicineChatDto } from './dto/update-telemedicine-chat.dto';
import { QueryTelemedicineChatDto } from './dto/query-telemedicine-chat.dto';

@ApiTags('Telemedicine Chats')
@ApiBearerAuth()
@Controller('telemedicine-chats')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class TelemedicineChatsController {
  constructor(
    private readonly telemedicineChatsService: TelemedicineChatsService,
  ) {}

  @Permissions(
    'telemedicine-chat.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateTelemedicineChatDto,
  ) {
    return this.telemedicineChatsService.create(
      dto,
    );
  }

  @Permissions(
    'telemedicine-chat.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryTelemedicineChatDto,
  ) {
    return this.telemedicineChatsService.findAll(
      query,
    );
  }

  @Permissions(
    'telemedicine-chat.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.telemedicineChatsService.findOne(
      id,
    );
  }

  @Permissions(
    'telemedicine-chat.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateTelemedicineChatDto,
  ) {
    return this.telemedicineChatsService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'telemedicine-chat.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.telemedicineChatsService.remove(
      id,
    );
  }
}