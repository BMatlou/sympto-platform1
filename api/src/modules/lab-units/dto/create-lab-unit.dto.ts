import {
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLabUnitDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  symbol!: string;

  @IsOptional()
  @IsString()
  description?: string;
}