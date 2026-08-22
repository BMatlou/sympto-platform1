import { PartialType } from '@nestjs/mapped-types';

import { CreateReferralStatusHistoryDto } from './create-referral-status-history.dto';

export class UpdateReferralStatusHistoryDto extends PartialType(
  CreateReferralStatusHistoryDto,
) {}