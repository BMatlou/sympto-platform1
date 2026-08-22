import {
  ImagingOrderStatus,
  ImagingPriority,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateImagingOrderDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  imagingCenterId?: string;

  @IsString()
  orderNumber!: string;

  @IsOptional()
  @IsEnum(ImagingPriority)
  priority?: ImagingPriority;

  @IsOptional()
  @IsEnum(ImagingOrderStatus)
  status?: ImagingOrderStatus;

  @IsOptional()
  @IsString()
  clinicalIndication?: string;
}