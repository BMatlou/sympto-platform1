import { PartialType } from '@nestjs/mapped-types';

import { CreateAIClinicalReviewDto } from './create-ai-clinical-review.dto';

export class UpdateAIClinicalReviewDto extends PartialType(
  CreateAIClinicalReviewDto,
) {}