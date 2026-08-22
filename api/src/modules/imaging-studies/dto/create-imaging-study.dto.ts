import {
  ImagingStudyStatus,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateImagingStudyDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  imagingCenterId?: string;

  @IsString()
  accessionNumber!: string;

  @IsString()
  studyInstanceUID!: string;

  @IsOptional()
  @IsEnum(ImagingStudyStatus)
  status?: ImagingStudyStatus;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsDateString()
  reportedAt?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;
}