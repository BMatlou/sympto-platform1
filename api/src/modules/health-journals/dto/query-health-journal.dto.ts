import {
  EnergyLevel,
  HealthJournalMood,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryHealthJournalDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsEnum(HealthJournalMood)
  mood?: HealthJournalMood;

  @IsOptional()
  @IsEnum(EnergyLevel)
  energyLevel?: EnergyLevel;
}