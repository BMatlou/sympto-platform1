import { PartialType } from '@nestjs/mapped-types';

import { CreateVitalTypeDto } from './create-vital-type.dto';

export class UpdateVitalTypeDto extends PartialType(
  CreateVitalTypeDto,
) {}