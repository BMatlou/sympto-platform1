import { PartialType } from '@nestjs/mapped-types';

import { CreateDispensationDto } from './create-dispensation.dto';

export class UpdateDispensationDto extends PartialType(
  CreateDispensationDto,
) {}