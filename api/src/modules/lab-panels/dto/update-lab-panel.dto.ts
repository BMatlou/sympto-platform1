import { PartialType } from '@nestjs/mapped-types';

import { CreateLabPanelDto } from './create-lab-panel.dto';

export class UpdateLabPanelDto extends PartialType(
  CreateLabPanelDto,
) {}