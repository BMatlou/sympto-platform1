import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { MessageStatus } from '@prisma/client';

export class CreateMessageDto {
  @IsUUID()
  conversationId!: string;

  @IsUUID()
  senderId!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;
}