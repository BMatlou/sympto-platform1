import { Type } from 'class-transformer';

import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateReceiptDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: Date;

  @Type(() => String)
  @IsNumberString()
  total!: string;
}