import {
  IsDateString,
  IsOptional,
  IsUUID,
  IsString,
} from 'class-validator';

export class CreateSpecimenDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  specimenTypeId!: string;

  @IsOptional()
  @IsUUID()
  containerId?: string;

  @IsString()
  barcode!: string;

  @IsOptional()
  @IsDateString()
  collectedAt?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
