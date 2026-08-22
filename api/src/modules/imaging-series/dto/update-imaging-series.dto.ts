import { PartialType } from '@nestjs/mapped-types';

import { CreateImagingSeriesDto } from './create-imaging-series.dto';

export class UpdateImagingSeriesDto extends PartialType(
  CreateImagingSeriesDto,
) {}