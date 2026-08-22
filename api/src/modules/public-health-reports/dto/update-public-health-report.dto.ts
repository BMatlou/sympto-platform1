import { PartialType } from '@nestjs/mapped-types';

import { CreatePublicHealthReportDto } from './create-public-health-report.dto';

export class UpdatePublicHealthReportDto extends PartialType(
  CreatePublicHealthReportDto,
) {}