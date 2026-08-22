import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateResultAmendmentDto {
  @IsUUID()
  resultId!: string;

  @IsUUID()
  practitionerId!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  amendedAt?: string;
}