import {
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryPatientBaselineDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;
}