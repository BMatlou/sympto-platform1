import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import {
  PrescriptionFrequency,
  PrescriptionRoute,
} from '@prisma/client';

export class CreatePrescriptionItemDto {
  @IsUUID()
  prescriptionId!: string;

  @IsUUID()
  medicationId!: string;

  @IsString()
  dosage!: string;

  @IsEnum(PrescriptionFrequency)
  frequency!: PrescriptionFrequency;

  @IsEnum(PrescriptionRoute)
  route!: PrescriptionRoute;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  refills?: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}