import { PartialType } from '@nestjs/mapped-types';

import { CreateDeviceMeasurementDto } from './create-device-measurement.dto';

export class UpdateDeviceMeasurementDto extends PartialType(
  CreateDeviceMeasurementDto,
) {}