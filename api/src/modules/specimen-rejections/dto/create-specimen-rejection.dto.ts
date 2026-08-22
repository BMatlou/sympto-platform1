import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSpecimenRejectionDto {
  @IsUUID()
  specimenId!: string;

  @IsOptional()
  @IsDateString()
  rejectedAt?: string;

  @IsString()
  reason!: string;
}