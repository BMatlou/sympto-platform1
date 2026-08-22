import { PartialType } from '@nestjs/mapped-types';

import { CreateLabOrderDto } from './create-lab-order.dto';

export class UpdateLabOrderDto extends PartialType(
  CreateLabOrderDto,
) {}