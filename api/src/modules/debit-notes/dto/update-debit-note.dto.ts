import { PartialType } from '@nestjs/mapped-types';

import { CreateDebitNoteDto } from './create-debit-note.dto';

export class UpdateDebitNoteDto extends PartialType(
  CreateDebitNoteDto,
) {}