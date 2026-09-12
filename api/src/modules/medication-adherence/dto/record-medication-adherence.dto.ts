import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export enum MedicationAdherenceAction {
  TAKEN = 'TAKEN',
  SKIPPED = 'SKIPPED',
}

export class RecordMedicationAdherenceDto {
  @IsOptional()
  @IsUUID()
  medicationId?: string;

  @IsEnum(MedicationAdherenceAction)
  action!: MedicationAdherenceAction;

  @IsOptional()
  @IsISO8601()
  scheduledFor?: string;

  @IsOptional()
  @IsUUID()
  notificationId?: string;
}
