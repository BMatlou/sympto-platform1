import { PartialType } from '@nestjs/mapped-types';

import { CreateSpecimenDto } from './create-specimen.dto';

export class UpdateSpecimenDto extends PartialType(
  CreateSpecimenDto,
) {}