import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLabCalibrationDto {
  @IsUUID()
  instrumentId!: string;

  @IsOptional()
  @IsUUID()
  performedById?: string;

  @IsDateString()
  calibrationDate!: string;

  @IsOptional()
  @IsDateString()
  nextCalibration?: string;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}