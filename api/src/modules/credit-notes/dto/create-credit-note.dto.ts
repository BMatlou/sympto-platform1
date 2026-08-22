import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCreditNoteDto {
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