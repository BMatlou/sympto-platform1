import { PartialType } from '@nestjs/mapped-types';

import { CreateLaboratoryInstrumentDto } from './create-laboratory-instrument.dto';

export class UpdateLaboratoryInstrumentDto extends PartialType(
  CreateLaboratoryInstrumentDto,
) {}