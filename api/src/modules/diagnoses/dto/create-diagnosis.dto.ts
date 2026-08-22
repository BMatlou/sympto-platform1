import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDiagnosisDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  icd10Code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}