import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClaimPaymentDto {
  @IsUUID()
  claimId!: string;

  @IsNumberString()
  amount!: string;

  @IsDateString()
  paidAt!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}