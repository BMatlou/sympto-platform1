import { PartialType } from '@nestjs/mapped-types';

import { CreateImagingDeviceDto } from './create-imaging-device.dto';

export class UpdateImagingDeviceDto extends PartialType(
  CreateImagingDeviceDto,
) {}