import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCriticalResultDto {
  @IsUUID()
  resultId!: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsDateString()
  notifiedAt?: string;

  @IsOptional()
  @IsDateString()
  acknowledgedAt?: string;

  @IsOptional()
  @IsString()
  comments?: string;
}