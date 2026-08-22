import { PartialType } from '@nestjs/mapped-types';

import { CreateClinicalNoteDto } from './create-clinical-note.dto';

export class UpdateClinicalNoteDto extends PartialType(
  CreateClinicalNoteDto,
) {}