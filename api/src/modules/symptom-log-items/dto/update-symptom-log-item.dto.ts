import { PartialType } from '@nestjs/mapped-types';

import { CreateSymptomLogItemDto } from './create-symptom-log-item.dto';

export class UpdateSymptomLogItemDto extends PartialType(
  CreateSymptomLogItemDto,
) {}