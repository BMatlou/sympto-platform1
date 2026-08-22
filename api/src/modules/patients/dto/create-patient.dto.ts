import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePatientDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  personId!: string;

  @IsOptional()
  @IsString()
  patientNumber?: string;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsDateString()
  dateOfDeath?: string;
}