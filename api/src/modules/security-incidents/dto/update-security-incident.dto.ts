import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateSecurityIncidentDto } from './create-security-incident.dto';

export class UpdateSecurityIncidentDto extends PartialType(
  CreateSecurityIncidentDto,
) {
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}