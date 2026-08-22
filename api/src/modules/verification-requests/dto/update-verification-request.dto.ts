import { PartialType } from '@nestjs/mapped-types';

import { CreateVerificationRequestDto } from './create-verification-request.dto';

export class UpdateVerificationRequestDto extends PartialType(
  CreateVerificationRequestDto,
) {}