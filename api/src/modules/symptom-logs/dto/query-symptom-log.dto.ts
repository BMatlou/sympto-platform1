import {
  SymptomLogStatus,
  SymptomProgression,
  SymptomSeverity,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QuerySymptomLogDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  clinicalEpisodeId?: string;

  @IsOptional()
  @IsEnum(SymptomLogStatus)
  status?: SymptomLogStatus;

  @IsOptional()
  @IsEnum(SymptomSeverity)
  overallSeverity?: SymptomSeverity;

  @IsOptional()
  @IsEnum(SymptomProgression)
  progression?: SymptomProgression;
}