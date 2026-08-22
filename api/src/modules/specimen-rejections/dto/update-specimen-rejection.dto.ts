import { PartialType } from '@nestjs/mapped-types';

import { CreateSpecimenRejectionDto } from './create-specimen-rejection.dto';

export class UpdateSpecimenRejectionDto extends PartialType(
  CreateSpecimenRejectionDto,
) {}