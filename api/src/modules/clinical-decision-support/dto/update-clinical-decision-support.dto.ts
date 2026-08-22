import { PartialType } from '@nestjs/mapped-types';

import { CreateClinicalDecisionSupportDto } from './create-clinical-decision-support.dto';

export class UpdateClinicalDecisionSupportDto extends PartialType(
  CreateClinicalDecisionSupportDto,
) {}