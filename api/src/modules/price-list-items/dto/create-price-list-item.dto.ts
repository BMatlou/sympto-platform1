import {
  IsNumberString,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePriceListItemDto {
  @IsUUID()
  priceListId!: string;

  @IsString()
  serviceCode!: string;

  @IsString()
  serviceName!: string;

  @IsNumberString()
  price!: string;
}