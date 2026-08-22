import {
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTelemedicineChatDto {
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  senderId!: string;

  @IsString()
  message!: string;
}