import { PartialType } from '@nestjs/mapped-types';

import { CreateCdsRuleExecutionDto } from './create-cds-rule-execution.dto';

export class UpdateCdsRuleExecutionDto extends PartialType(
  CreateCdsRuleExecutionDto,
) {}