import { PartialType } from '@nestjs/mapped-types';

import { CreateWearableDeviceDto } from './create-wearable-device.dto';

export class UpdateWearableDeviceDto extends PartialType(
  CreateWearableDeviceDto,
) {}