import { PartialType } from '@nestjs/mapped-types';

import { CreateReferralDocumentDto } from './create-referral-document.dto';

export class UpdateReferralDocumentDto extends PartialType(
  CreateReferralDocumentDto,
) {}