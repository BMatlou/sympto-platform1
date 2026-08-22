import { PartialType } from '@nestjs/mapped-types';

import { CreatePracticeLocationDto } from './create-practice-location.dto';

export class UpdatePracticeLocationDto extends PartialType(
  CreatePracticeLocationDto,
) {}