import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePatientMedicalHistoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  pastMedicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  surgicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  familyHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  socialHistory?: string;
}
