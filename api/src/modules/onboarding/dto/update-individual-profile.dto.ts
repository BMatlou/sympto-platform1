import {
  IsBoolean,
  IsDecimal,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  AlcoholConsumption,
  ActivityLevel,
  BloodType,
  DominantHand,
  ExerciseFrequency,
  RhesusFactor,
  SmokingStatus,
} from "@prisma/client";

export class UpdateIndividualProfileDto {
  @IsOptional()
@IsNumber()
heightCm?: number;

@IsOptional()
@IsNumber()
weightKg?: number;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsEnum(RhesusFactor)
  rhesusFactor?: RhesusFactor;

  @IsOptional()
  @IsEnum(DominantHand)
  dominantHand?: DominantHand;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsEnum(SmokingStatus)
  smokingStatus?: SmokingStatus;

  @IsOptional()
  @IsEnum(AlcoholConsumption)
  alcoholConsumption?: AlcoholConsumption;

  @IsOptional()
@IsEnum(ActivityLevel)
activityLevel?: ActivityLevel;

  @IsOptional()
  @IsEnum(ExerciseFrequency)
  exerciseFrequency?: ExerciseFrequency;

  @IsOptional()
  @IsBoolean()
  organDonor?: boolean;

  @IsOptional()
  @IsBoolean()
  shareByDefault?: boolean;

  @IsOptional()
  @IsString()
  emergencyNotes?: string;
}