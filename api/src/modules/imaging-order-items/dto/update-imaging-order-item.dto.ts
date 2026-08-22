import { PartialType } from '@nestjs/mapped-types';

import { CreateImagingOrderItemDto } from './create-imaging-order-item.dto';

export class UpdateImagingOrderItemDto extends PartialType(
  CreateImagingOrderItemDto,
) {}