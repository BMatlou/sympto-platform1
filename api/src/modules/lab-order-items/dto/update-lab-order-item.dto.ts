import { PartialType } from '@nestjs/mapped-types';

import { CreateLabOrderItemDto } from './create-lab-order-item.dto';

export class UpdateLabOrderItemDto extends PartialType(
  CreateLabOrderItemDto,
) {}