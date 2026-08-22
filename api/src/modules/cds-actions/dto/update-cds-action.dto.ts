import { PartialType } from '@nestjs/mapped-types';

import { CreateCdsActionDto } from './create-cds-action.dto';

export class UpdateCdsActionDto extends PartialType(
  CreateCdsActionDto,
) {}