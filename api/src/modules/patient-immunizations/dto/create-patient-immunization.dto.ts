import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePatientImmunizationDto {
  @IsUUID()
  healthPassportId!: string;

  @IsUUID()
  immunizationId!: string;

  @IsOptional()
  @IsDateString()
  administeredAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  doseNumber?: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  administeredBy?: string;

  @IsOptional()
  @IsString()
  facility?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}