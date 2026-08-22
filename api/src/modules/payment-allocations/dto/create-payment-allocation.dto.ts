import {
  IsNumberString,
  IsUUID,
} from 'class-validator';

export class CreatePaymentAllocationDto {
  @IsUUID()
  paymentId!: string;

  @IsUUID()
  invoiceId!: string;

  @IsNumberString()
  amount!: string;
}