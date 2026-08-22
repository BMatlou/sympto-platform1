import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAllergyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  snomedCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  common?: boolean;

  @IsOptional()
  @IsBoolean()
  searchable?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}