import {
  SymptomSeverity,
  SymptomProgression,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QuerySymptomLogItemDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  symptomLogId?: string;

  @IsOptional()
  @IsUUID()
  aISymptomId?: string;

  @IsOptional()
  @IsEnum(SymptomSeverity)
  severity?: SymptomSeverity;

  @IsOptional()
  @IsEnum(SymptomProgression)
  progression?: SymptomProgression;
}