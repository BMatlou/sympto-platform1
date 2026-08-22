import { PartialType } from '@nestjs/mapped-types';

import { CreateReferralNoteDto } from './create-referral-note.dto';

export class UpdateReferralNoteDto extends PartialType(
  CreateReferralNoteDto,
) {}