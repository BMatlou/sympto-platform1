import {
  EnergyLevel,
  HealthJournalMood,
  SleepQuality,
} from '@prisma/client';

import {
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateHealthJournalDto {
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  journal!: string;

  @IsOptional()
  @IsEnum(HealthJournalMood)
  mood?: HealthJournalMood;

  @IsOptional()
  @IsEnum(SleepQuality)
  sleepQuality?: SleepQuality;

  @IsOptional()
  @IsDecimal()
  sleepHours?: string;

  @IsOptional()
  @IsEnum(EnergyLevel)
  energyLevel?: EnergyLevel;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  stressLevel?: number;

  @IsOptional()
  @IsInt()
  exerciseMinutes?: number;

  @IsOptional()
  @IsInt()
  waterIntakeMl?: number;

  @IsOptional()
  @IsDecimal()
  weightKg?: string;

  @IsOptional()
  @IsDecimal()
  temperature?: string;

  @IsOptional()
  @IsInt()
  bloodPressureSystolic?: number;

  @IsOptional()
  @IsInt()
  bloodPressureDiastolic?: number;

  @IsOptional()
  @IsInt()
  heartRate?: number;

  @IsOptional()
  @IsDecimal()
  oxygenSaturation?: string;

  @IsOptional()
  @IsInt()
  respiratoryRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}