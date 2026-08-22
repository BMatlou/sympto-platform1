import { PartialType } from '@nestjs/mapped-types';

import { CreatePatientDiagnosisDto } from './create-patient-diagnosis.dto';

export class UpdatePatientDiagnosisDto extends PartialType(
  CreatePatientDiagnosisDto,
) {}