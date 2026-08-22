import { PartialType } from '@nestjs/mapped-types';

import { CreateImagingReportDto } from './create-imaging-report.dto';

export class UpdateImagingReportDto extends PartialType(
  CreateImagingReportDto,
) {}