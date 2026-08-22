import { PartialType } from '@nestjs/mapped-types';

import { CreateLabAuditDto } from './create-lab-audit.dto';

export class UpdateLabAuditDto extends PartialType(
  CreateLabAuditDto,
) {}