import {
  IsNumberString,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInvoiceItemDto {
  @IsUUID()
  invoiceId!: string;

  @IsString()
  description!: string;

  @IsNumberString()
  quantity!: string;

  @IsNumberString()
  unitPrice!: string;

  @IsNumberString()
  discount!: string;

  @IsNumberString()
  tax!: string;

  @IsNumberString()
  total!: string;
}