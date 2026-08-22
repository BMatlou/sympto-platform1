import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateImagingReportDto {
  @IsUUID()
  studyId!: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsString()
  findings!: string;

  @IsOptional()
  @IsString()
  impression?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;
}