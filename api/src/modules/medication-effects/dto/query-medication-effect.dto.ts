import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryMedicationEffectDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  symptomLogId?: string;

  @IsOptional()
  @IsUUID()
  medicationId?: string;

  @IsOptional()
  @IsUUID()
  prescriptionId?: string;

  @IsOptional()
  @IsBoolean()
  improved?: boolean;
}