import { PartialType } from '@nestjs/mapped-types';

import { CreatePublicHealthAttachmentDto } from './create-public-health-attachment.dto';

export class UpdatePublicHealthAttachmentDto extends PartialType(
  CreatePublicHealthAttachmentDto,
) {}