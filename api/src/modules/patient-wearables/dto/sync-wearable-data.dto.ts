import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MeasurementType, SleepStageType } from '@prisma/client';

export class WearableMeasurementRecordDto {
  @IsEnum(MeasurementType)
  measurementType!: MeasurementType;

  @IsOptional()
  @IsString()
  metricKey?: string;

  @IsNumber()
  value!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsNumber()
  secondaryValue?: number;

  @IsOptional()
  @IsString()
  secondaryUnit?: string;

  @IsDateString()
  measuredAt!: string;

  @IsOptional()
  @IsString()
  externalRecordId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class WearableSleepStageDto {
  @IsEnum(SleepStageType)
  stage!: SleepStageType;

  @IsDateString()
  startedAt!: string;

  @IsDateString()
  endedAt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number;
}

export class WearableSleepSessionDto {
  @IsDateString()
  startedAt!: string;

  @IsDateString()
  endedAt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  sleepScore?: number;

  @IsOptional()
  @IsString()
  externalRecordId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WearableSleepStageDto)
  stages?: WearableSleepStageDto[];
}

export class WearableWorkoutSessionDto {
  @IsString()
  activityType!: string;

  @IsDateString()
  startedAt!: string;

  @IsDateString()
  endedAt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsNumber()
  distance?: number;

  @IsOptional()
  @IsString()
  distanceUnit?: string;

  @IsOptional()
  @IsNumber()
  calories?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  averageHeartRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maximumHeartRate?: number;

  @IsOptional()
  @IsString()
  externalRecordId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class WearableWellnessMetricDto {
  @IsString()
  metricKey!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsDateString()
  measuredAt!: string;

  @IsOptional()
  @IsString()
  externalRecordId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SyncWearableDataDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WearableMeasurementRecordDto)
  measurements?: WearableMeasurementRecordDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WearableSleepSessionDto)
  sleepSessions?: WearableSleepSessionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WearableWorkoutSessionDto)
  workouts?: WearableWorkoutSessionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WearableWellnessMetricDto)
  wellnessMetrics?: WearableWellnessMetricDto[];
}
