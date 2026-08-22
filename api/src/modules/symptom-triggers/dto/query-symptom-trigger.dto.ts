import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QuerySymptomTriggerDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  symptomLogId?: string;

  @IsOptional()
  @IsBoolean()
  suspected?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}