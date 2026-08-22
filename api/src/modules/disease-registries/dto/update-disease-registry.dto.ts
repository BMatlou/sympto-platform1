import { PartialType } from '@nestjs/mapped-types';

import { CreateDiseaseRegistryDto } from './create-disease-registry.dto';

export class UpdateDiseaseRegistryDto extends PartialType(
  CreateDiseaseRegistryDto,
) {}