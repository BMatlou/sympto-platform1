import { PartialType } from '@nestjs/mapped-types';

import { CreateAIDifferentialDiagnosisDto } from './create-ai-differential-diagnosis.dto';

export class UpdateAIDifferentialDiagnosisDto extends PartialType(
  CreateAIDifferentialDiagnosisDto,
) {}