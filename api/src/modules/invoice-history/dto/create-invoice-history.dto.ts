import { InvoiceStatus } from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInvoiceHistoryDto {
  @IsUUID()
  invoiceId!: string;

  @IsEnum(InvoiceStatus)
  status!: InvoiceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}