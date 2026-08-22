import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDiseaseRegistryDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  notifiable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  reportingWindowHours?: number;
}