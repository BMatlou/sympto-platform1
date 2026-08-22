import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLabQualityControlDto {
  @IsUUID()
  instrumentId!: string;

  @IsOptional()
  @IsUUID()
  testId?: string;

  @IsDateString()
  performedAt!: string;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}