import { PartialType } from '@nestjs/mapped-types';

import { CreateHealthGoalProgressDto } from './create-health-goal-progress.dto';

export class UpdateHealthGoalProgressDto extends PartialType(
  CreateHealthGoalProgressDto,
) {}