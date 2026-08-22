import { PartialType } from '@nestjs/mapped-types';

import { CreateLabCategoryDto } from './create-lab-category.dto';

export class UpdateLabCategoryDto extends PartialType(
  CreateLabCategoryDto,
) {}