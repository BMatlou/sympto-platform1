import { PartialType } from '@nestjs/mapped-types';

import { CreateLabDisciplineDto } from './create-lab-discipline.dto';

export class UpdateLabDisciplineDto extends PartialType(
  CreateLabDisciplineDto,
) {}