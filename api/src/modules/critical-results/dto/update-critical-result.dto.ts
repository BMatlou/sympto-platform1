import { PartialType } from '@nestjs/mapped-types';

import { CreateCriticalResultDto } from './create-critical-result.dto';

export class UpdateCriticalResultDto extends PartialType(
  CreateCriticalResultDto,
) {}