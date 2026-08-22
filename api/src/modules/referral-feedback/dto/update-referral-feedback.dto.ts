import { PartialType } from '@nestjs/mapped-types';

import { CreateReferralFeedbackDto } from './create-referral-feedback.dto';

export class UpdateReferralFeedbackDto extends PartialType(
  CreateReferralFeedbackDto,
) {}