import { PartialType } from '@nestjs/mapped-types';

import { CreateLabUnitDto } from './create-lab-unit.dto';

export class UpdateLabUnitDto extends PartialType(
  CreateLabUnitDto,
) {}