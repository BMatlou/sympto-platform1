import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryRiskAssessmentResultDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  riskAssessmentId?: string;

  @IsOptional()
  @IsString()
  factor?: string;
}