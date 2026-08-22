import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryAIObservationDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  symptomLogId?: string;

  @IsOptional()
  @IsUUID()
  aiAnalysisId?: string;

  @IsOptional()
  @IsBoolean()
  requiresAttention?: boolean;

  @IsOptional()
  @IsBoolean()
  reviewed?: boolean;
}