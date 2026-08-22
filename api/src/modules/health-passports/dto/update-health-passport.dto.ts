import { PartialType } from '@nestjs/mapped-types';

import { CreateHealthPassportDto } from './create-health-passport.dto';

export class UpdateHealthPassportDto extends PartialType(
  CreateHealthPassportDto,
) {}