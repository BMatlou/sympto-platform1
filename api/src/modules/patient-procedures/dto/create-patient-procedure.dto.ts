import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePatientProcedureDto {
  @IsUUID()
  healthPassportId!: string;

  @IsUUID()
  encounterId!: string;

  @IsUUID()
  procedureId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;
}