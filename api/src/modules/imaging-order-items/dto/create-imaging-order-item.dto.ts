import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateImagingOrderItemDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  procedureId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}