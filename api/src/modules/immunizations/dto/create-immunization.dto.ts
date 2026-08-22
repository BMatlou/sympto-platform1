import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateImmunizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  diseaseProtected!: string;
}