import { PartialType } from '@nestjs/mapped-types';

import { CreateAIQuestionDto } from './create-ai-question.dto';

export class UpdateAIQuestionDto extends PartialType(
  CreateAIQuestionDto,
) {}