import { PartialType } from '@nestjs/mapped-types';

import { CreateSpecimenContainerDto } from './create-specimen-container.dto';

export class UpdateSpecimenContainerDto extends PartialType(
  CreateSpecimenContainerDto,
) {}