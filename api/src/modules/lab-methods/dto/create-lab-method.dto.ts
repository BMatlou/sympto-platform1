import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLabMethodDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}