import { PartialType } from '@nestjs/mapped-types';

import { CreateLabQualityControlDto } from './create-lab-quality-control.dto';

export class UpdateLabQualityControlDto extends PartialType(
  CreateLabQualityControlDto,
) {}