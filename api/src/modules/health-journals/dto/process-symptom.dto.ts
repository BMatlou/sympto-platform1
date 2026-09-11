import { SymptomSeverity } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class ProcessSymptomDto {
  @IsString()
  @MinLength(2)
  symptomName!: string;

  @IsEnum(SymptomSeverity)
  severity!: SymptomSeverity;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  details?: string;
}
