import { PartialType } from '@nestjs/mapped-types';

import { CreateSymptomLogAttachmentDto } from './create-symptom-log-attachment.dto';

export class UpdateSymptomLogAttachmentDto extends PartialType(
  CreateSymptomLogAttachmentDto,
) {}