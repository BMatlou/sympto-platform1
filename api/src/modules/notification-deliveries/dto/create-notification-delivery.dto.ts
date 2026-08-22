import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateNotificationDeliveryDto {
  @IsUUID()
  notificationId!: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}