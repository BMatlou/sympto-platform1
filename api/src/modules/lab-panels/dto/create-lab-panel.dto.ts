import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLabPanelDto {
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