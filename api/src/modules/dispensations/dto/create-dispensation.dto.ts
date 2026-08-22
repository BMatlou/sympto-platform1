import {
  IsDateString,
  IsDecimal,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDispensationDto {
  @IsUUID()
  prescriptionItemId!: string;

  @IsUUID()
  pharmacyId!: string;

  @IsOptional()
  @IsDecimal()
  quantity?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: Date;

  @IsOptional()
  @IsString()
  pharmacistName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}