import { PartialType } from '@nestjs/mapped-types';

import { CreateClinicalEpisodeDto } from './create-clinical-episode.dto';

export class UpdateClinicalEpisodeDto extends PartialType(
  CreateClinicalEpisodeDto,
) {}