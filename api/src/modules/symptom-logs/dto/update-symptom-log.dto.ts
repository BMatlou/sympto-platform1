import { PartialType } from '@nestjs/mapped-types';

import { CreateSymptomLogDto } from './create-symptom-log.dto';

export class UpdateSymptomLogDto extends PartialType(
  CreateSymptomLogDto,
) {}