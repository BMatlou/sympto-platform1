import { PartialType } from '@nestjs/mapped-types';

import { CreateCdsOverrideDto } from './create-cds-override.dto';

export class UpdateCdsOverrideDto extends PartialType(
  CreateCdsOverrideDto,
) {}