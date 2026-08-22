import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { LabOrderStatus } from '@prisma/client';

export class CreateLabOrderDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  laboratoryId?: string;

  @IsString()
  orderNumber!: string;

  @IsOptional()
  @IsEnum(LabOrderStatus)
  status?: LabOrderStatus;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsDateString()
  orderedAt?: string;
}