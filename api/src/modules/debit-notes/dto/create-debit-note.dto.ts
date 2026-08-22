import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDebitNoteDto {
  @IsUUID()
  invoiceId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: Date;
}