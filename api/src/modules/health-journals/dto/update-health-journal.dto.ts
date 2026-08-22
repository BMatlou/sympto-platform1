import { PartialType } from '@nestjs/mapped-types';

import { CreateHealthJournalDto } from './create-health-journal.dto';

export class UpdateHealthJournalDto extends PartialType(
  CreateHealthJournalDto,
) {}