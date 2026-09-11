import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { QueryConversationDto } from './dto/query-conversation.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Permissions('conversation.create')
  @Post()
  create(@Body() dto: CreateConversationDto) { return this.conversationsService.create(dto); }

  @Permissions('conversation.read')
  @Get()
  findAll(@Req() req: any, @Query() query: QueryConversationDto) { return this.conversationsService.findAll(query, req.user.sub); }

  @Permissions('conversation.read')
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) { return this.conversationsService.findOne(id, req.user.sub); }

  @Permissions('conversation.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConversationDto) { return this.conversationsService.update(id, dto); }

  @Permissions('conversation.update')
  @Post(':id/participants/:userId')
  addParticipant(@Param('id') id: string, @Param('userId') userId: string) { return this.conversationsService.addParticipant(id, userId); }

  @Permissions('conversation.update')
  @Delete(':id/participants/:userId')
  removeParticipant(@Param('id') id: string, @Param('userId') userId: string) { return this.conversationsService.removeParticipant(id, userId); }

  @Permissions('conversation.delete')
  @Delete(':id')
  remove(@Param('id') id: string) { return this.conversationsService.remove(id); }
}
