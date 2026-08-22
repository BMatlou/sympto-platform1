import { PartialType } from '@nestjs/mapped-types';

import { CreateLabResultItemDto } from './create-lab-result-item.dto';

export class UpdateLabResultItemDto extends PartialType(
  CreateLabResultItemDto,
) {}