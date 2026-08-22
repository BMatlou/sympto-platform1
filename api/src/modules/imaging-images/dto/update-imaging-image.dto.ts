import { PartialType } from '@nestjs/mapped-types';

import { CreateImagingImageDto } from './create-imaging-image.dto';

export class UpdateImagingImageDto extends PartialType(
  CreateImagingImageDto,
) {}