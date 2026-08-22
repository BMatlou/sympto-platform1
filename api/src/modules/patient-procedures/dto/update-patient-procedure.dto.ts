import { PartialType } from '@nestjs/mapped-types';

import { CreatePatientProcedureDto } from './create-patient-procedure.dto';

export class UpdatePatientProcedureDto extends PartialType(
  CreatePatientProcedureDto,
) {}