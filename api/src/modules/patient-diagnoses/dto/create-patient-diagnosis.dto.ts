import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePatientDiagnosisDto {
@IsUUID()
healthPassportId!: string;

  @IsUUID()
  encounterId!: string;

  @IsUUID()
  diagnosisId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}