import { PartialType } from '@nestjs/mapped-types';

import { CreatePatientBaselineDto } from './create-patient-baseline.dto';

export class UpdatePatientBaselineDto extends PartialType(
  CreatePatientBaselineDto,
) {}