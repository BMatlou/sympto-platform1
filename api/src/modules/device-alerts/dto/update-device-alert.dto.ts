import {
  IsBoolean,
  IsDateString,
  IsOptional,
} from 'class-validator';

import { PartialType } from '@nestjs/mapped-types';

import { CreateDeviceAlertDto } from './create-device-alert.dto';

export class UpdateDeviceAlertDto extends PartialType(
  CreateDeviceAlertDto,
) {
  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @IsOptional()
  @IsDateString()
  acknowledgedAt?: Date;
}