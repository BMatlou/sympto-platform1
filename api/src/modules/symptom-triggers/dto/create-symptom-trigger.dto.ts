import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSymptomTriggerDto {
  @IsUUID()
  symptomLogId!: string;

  @IsString()
  trigger!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  suspected?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;

  @IsOptional()
  @IsDateString()
  exposureAt?: string;

  @IsOptional()
  @IsInt()
  occurredBeforeHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}