import { PartialType } from '@nestjs/mapped-types';

import { CreateLabPanelItemDto } from './create-lab-panel-item.dto';

export class UpdateLabPanelItemDto extends PartialType(
  CreateLabPanelItemDto,
) {}