import { PartialType } from '@nestjs/mapped-types';

import { CreateClaimPaymentDto } from './create-claim-payment.dto';

export class UpdateClaimPaymentDto extends PartialType(
  CreateClaimPaymentDto,
) {}