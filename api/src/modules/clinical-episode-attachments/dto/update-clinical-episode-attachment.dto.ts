import { PartialType } from '@nestjs/mapped-types';

import { CreateClinicalEpisodeAttachmentDto } from './create-clinical-episode-attachment.dto';

export class UpdateClinicalEpisodeAttachmentDto extends PartialType(
  CreateClinicalEpisodeAttachmentDto,
) {}