import { PartialType } from '@nestjs/mapped-types';

import { CreateRiskAssessmentResultDto } from './create-risk-assessment-result.dto';

export class UpdateRiskAssessmentResultDto extends PartialType(
  CreateRiskAssessmentResultDto,
) {}