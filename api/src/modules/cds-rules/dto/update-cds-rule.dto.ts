import { PartialType } from '@nestjs/mapped-types';

import { CreateCdsRuleDto } from './create-cds-rule.dto';

export class UpdateCdsRuleDto extends PartialType(
  CreateCdsRuleDto,
) {}