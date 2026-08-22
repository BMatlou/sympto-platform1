import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLabResultItemDto {
  @IsUUID()
  resultId!: string;

  @IsUUID()
  orderItemId!: string;

  @IsUUID()
  testId!: string;

  @IsOptional()
  @IsNumber()
  numericValue?: number;

  @IsOptional()
  @IsString()
  textValue?: string;

  @IsOptional()
  @IsBoolean()
  booleanValue?: boolean;

  @IsOptional()
  @IsDateString()
  dateValue?: string;

  @IsOptional()
  @IsBoolean()
  abnormal?: boolean;

  @IsOptional()
  @IsBoolean()
  critical?: boolean;

  @IsOptional()
  @IsString()
  comments?: string;
}