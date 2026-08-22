import {
  InvoiceStatus,
  InvoiceType,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsString()
  invoiceNumber!: string;

  @IsEnum(InvoiceType)
  type!: InvoiceType;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsNumberString()
  subtotal!: string;

  @IsOptional()
  @IsNumberString()
  discount?: string;

  @IsOptional()
  @IsNumberString()
  tax?: string;

  @IsNumberString()
  total!: string;

  @IsOptional()
  @IsNumberString()
  amountPaid?: string;

  @IsOptional()
  @IsNumberString()
  balance?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsDateString()
  paidAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}