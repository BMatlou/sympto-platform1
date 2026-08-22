import {
  IsDateString,
  IsOptional,
} from 'class-validator';

import { PartialType } from '@nestjs/mapped-types';

import { CreateDataAccessConsentDto } from './create-data-access-consent.dto';

export class UpdateDataAccessConsentDto extends PartialType(
  CreateDataAccessConsentDto,
) {
  @IsOptional()
  @IsDateString()
  revokedAt?: Date;
}