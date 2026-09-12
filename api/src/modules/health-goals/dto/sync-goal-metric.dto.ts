import {
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class SyncGoalMetricDto {
  @IsString()
  metricType!: string;

  @IsString()
  metricKey!: string;

  @IsNumber()
  loggedValue!: number;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
