import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEncounterTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}