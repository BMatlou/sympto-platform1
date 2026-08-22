import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRefundDto {
  @IsUUID()
  paymentId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  refundedAt?: Date;
}