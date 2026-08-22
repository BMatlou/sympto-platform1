import { PartialType } from '@nestjs/mapped-types';

import { CreateCarePlanNoteDto } from './create-care-plan-note.dto';

export class UpdateCarePlanNoteDto extends PartialType(
  CreateCarePlanNoteDto,
) {}