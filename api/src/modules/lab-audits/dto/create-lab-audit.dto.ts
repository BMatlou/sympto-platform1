import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLabAuditDto {
  @IsUUID()
  laboratoryId!: string;

  @IsOptional()
  @IsUUID()
  auditorId?: string;

  @IsDateString()
  auditDate!: string;

  @IsString()
  outcome!: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;
}