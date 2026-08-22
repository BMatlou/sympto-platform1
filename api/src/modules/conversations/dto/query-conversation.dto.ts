import { Type } from 'class-transformer';

import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class QueryConversationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsUUID()
  participantId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isGroup?: boolean;

  @IsOptional()
  @IsString()
  title?: string;
}