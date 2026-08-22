import { PartialType } from '@nestjs/mapped-types';

import { CreateHealthGoalDto } from './create-health-goal.dto';

export class UpdateHealthGoalDto extends PartialType(
  CreateHealthGoalDto,
) {}