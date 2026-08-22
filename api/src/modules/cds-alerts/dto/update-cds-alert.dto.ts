import { PartialType } from '@nestjs/mapped-types';

import { CreateCdsAlertDto } from './create-cds-alert.dto';

export class UpdateCdsAlertDto extends PartialType(
  CreateCdsAlertDto,
) {}