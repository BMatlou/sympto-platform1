import { PartialType } from '@nestjs/mapped-types';

import { CreateComplianceIssueDto } from './create-compliance-issue.dto';

export class UpdateComplianceIssueDto extends PartialType(
  CreateComplianceIssueDto,
) {}