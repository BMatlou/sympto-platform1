import { PartialType } from '@nestjs/mapped-types';
import { CreateInsurancePolicyDto } from './create-insurance-policy.dto';

export class UpdateInsurancePolicyDto extends PartialType(CreateInsurancePolicyDto) {}
