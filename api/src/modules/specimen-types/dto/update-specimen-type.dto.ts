import { PartialType } from '@nestjs/mapped-types';

import { CreateSpecimenTypeDto } from './create-specimen-type.dto';

export class UpdateSpecimenTypeDto extends PartialType(
  CreateSpecimenTypeDto,
) {}