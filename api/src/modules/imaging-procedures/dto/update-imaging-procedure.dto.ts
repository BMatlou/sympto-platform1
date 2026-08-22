import { PartialType } from '@nestjs/mapped-types';

import { CreateImagingProcedureDto } from './create-imaging-procedure.dto';

export class UpdateImagingProcedureDto extends PartialType(
  CreateImagingProcedureDto,
) {}