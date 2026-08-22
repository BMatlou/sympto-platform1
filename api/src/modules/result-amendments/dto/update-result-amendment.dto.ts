import { PartialType } from '@nestjs/mapped-types';

import { CreateResultAmendmentDto } from './create-result-amendment.dto';

export class UpdateResultAmendmentDto extends PartialType(
  CreateResultAmendmentDto,
) {}