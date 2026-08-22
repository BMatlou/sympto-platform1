import { PartialType } from '@nestjs/mapped-types';

import { CreatePatientConditionDto } from './create-patient-condition.dto';

export class UpdatePatientConditionDto extends PartialType(
  CreatePatientConditionDto,
) {}