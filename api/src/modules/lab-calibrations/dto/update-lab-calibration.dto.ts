import { PartialType } from '@nestjs/mapped-types';

import { CreateLabCalibrationDto } from './create-lab-calibration.dto';

export class UpdateLabCalibrationDto extends PartialType(
  CreateLabCalibrationDto,
) {}