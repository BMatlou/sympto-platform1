import { PartialType } from '@nestjs/mapped-types';

import { CreateCarePlanGoalDto } from './create-care-plan-goal.dto';

export class UpdateCarePlanGoalDto extends PartialType(
  CreateCarePlanGoalDto,
) {}