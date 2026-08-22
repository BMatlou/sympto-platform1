import { PartialType } from '@nestjs/mapped-types';

import { CreateImagingOrderDto } from './create-imaging-order.dto';

export class UpdateImagingOrderDto extends PartialType(
  CreateImagingOrderDto,
) {}