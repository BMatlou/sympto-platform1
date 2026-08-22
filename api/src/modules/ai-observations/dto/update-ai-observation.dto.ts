import { PartialType } from '@nestjs/mapped-types';

import { CreateAIObservationDto } from './create-ai-observation.dto';

export class UpdateAIObservationDto extends PartialType(
  CreateAIObservationDto,
) {}