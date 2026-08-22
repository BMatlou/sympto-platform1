import { PartialType } from '@nestjs/mapped-types';

import { CreateResultVerificationDto } from './create-result-verification.dto';

export class UpdateResultVerificationDto extends PartialType(
  CreateResultVerificationDto,
) {}