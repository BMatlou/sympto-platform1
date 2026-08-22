import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAccessLogDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsBoolean()
  successful!: boolean;

  @IsOptional()
  @IsString()
  failureReason?: string;
}