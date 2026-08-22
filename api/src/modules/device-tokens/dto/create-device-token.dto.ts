import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDeviceTokenDto {
  @IsUUID()
  userId!: string;

  @IsString()
  token!: string;

  @IsString()
  platform!: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}