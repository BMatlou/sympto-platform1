import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateVitalTypeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  unit?: string;
}