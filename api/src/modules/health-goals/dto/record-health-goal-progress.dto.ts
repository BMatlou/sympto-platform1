import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class RecordHealthGoalProgressDto {
  @IsNumberString()
  currentValue!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}