import { PartialType } from '@nestjs/mapped-types';

import { CreateImagingCenterDto } from './create-imaging-center.dto';

export class UpdateImagingCenterDto extends PartialType(
  CreateImagingCenterDto,
) {}