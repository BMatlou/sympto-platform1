import {
  IsDateString,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreateClinicalVitalDto {
  @IsUUID()
  encounterId!: string;

  @IsUUID()
  vitalTypeId!: string;

  @IsNumber()
  value!: number;

  @IsDateString()
  measuredAt!: string;
}