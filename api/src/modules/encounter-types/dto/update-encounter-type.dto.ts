import { PartialType } from '@nestjs/mapped-types';

import { CreateEncounterTypeDto } from './create-encounter-type.dto';

export class UpdateEncounterTypeDto extends PartialType(
  CreateEncounterTypeDto,
) {}