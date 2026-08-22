import { PartialType } from '@nestjs/mapped-types';

import { CreatePublicHealthSubmissionDto } from './create-public-health-submission.dto';

export class UpdatePublicHealthSubmissionDto extends PartialType(
  CreatePublicHealthSubmissionDto,
) {}