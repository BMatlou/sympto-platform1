import { PartialType } from '@nestjs/mapped-types';

import { CreateInvoiceHistoryDto } from './create-invoice-history.dto';

export class UpdateInvoiceHistoryDto extends PartialType(
  CreateInvoiceHistoryDto,
) {}