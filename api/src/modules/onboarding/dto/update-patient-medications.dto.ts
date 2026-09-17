import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MedicationStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

const MEDICATION_FREQUENCIES = [
  'ONCE_DAILY',
  'TWICE_DAILY',
  'THREE_TIMES_DAILY',
  'FOUR_TIMES_DAILY',
  'AS_NEEDED',
  'WEEKLY',
  'OTHER',
] as const;

const MEDICATION_ROUTES = [
  'ORAL',
  'INHALATION',
  'INJECTION',
  'TOPICAL',
  'OPHTHALMIC',
  'OTIC',
  'OTHER',
] as const;

function normalizeMedicationDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export class PatientMedicationItemDto {
  @IsOptional()
  @IsUUID()
  patientMedicationId?: string;

  // Existing PatientMedication rows may arrive from the live page with a blank
  // catalog medicationId. The manage service resolves that from patientMedicationId.
  @ValidateIf((object) => !object.patientMedicationId || Boolean(object.medicationId))
  @IsUUID()
  medicationId!: string;

  @IsOptional() @IsString() @MaxLength(100) dosage?: string;
  @IsOptional() @IsString() @IsIn(MEDICATION_FREQUENCIES) @MaxLength(50) frequency?: string;
  @IsOptional() @IsString() @IsIn(MEDICATION_ROUTES) @MaxLength(50) route?: string;
  @IsOptional() @IsString() @MaxLength(255) indication?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() @MaxLength(150) prescribedBy?: string;
  @IsOptional()
  @Transform(({ value }) => normalizeMedicationDate(value))
  @IsDateString()
  startedAt?: string;
  @IsOptional()
  @Transform(({ value }) => normalizeMedicationDate(value))
  @IsDateString()
  endedAt?: string;
  @IsOptional() @IsBoolean() ongoing?: boolean;
  @IsOptional() @IsNumber() @Min(0) adherencePercentage?: number;
  @IsOptional() @IsNumber() @Min(0) missedDoses?: number;
  @IsOptional() @IsString() sideEffects?: string;
  @IsOptional() @IsString() @MaxLength(255) effectiveness?: string;
  @IsOptional() @IsEnum(MedicationStatus) status: MedicationStatus = MedicationStatus.ACTIVE;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdatePatientMedicationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientMedicationItemDto)
  medications!: PatientMedicationItemDto[];
}
