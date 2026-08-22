import { PartialType } from '@nestjs/mapped-types';

import { CreateSpecimenCollectionDto } from './create-specimen-collection.dto';

export class UpdateSpecimenCollectionDto extends PartialType(
  CreateSpecimenCollectionDto,
) {}