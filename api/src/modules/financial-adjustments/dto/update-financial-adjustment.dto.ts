import { PartialType } from '@nestjs/mapped-types';

import { CreateFinancialAdjustmentDto } from './create-financial-adjustment.dto';

export class UpdateFinancialAdjustmentDto extends PartialType(
  CreateFinancialAdjustmentDto,
) {}