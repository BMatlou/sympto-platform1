import { PartialType } from '@nestjs/mapped-types';

import { CreateResultAttachmentDto } from './create-result-attachment.dto';

export class UpdateResultAttachmentDto extends PartialType(
  CreateResultAttachmentDto,
) {}