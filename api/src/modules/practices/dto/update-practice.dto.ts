import { PartialType } from '@nestjs/mapped-types';

import { CreatePracticeDto } from './create-practice.dto';

export class UpdatePracticeDto extends PartialType(
  CreatePracticeDto,
) {}