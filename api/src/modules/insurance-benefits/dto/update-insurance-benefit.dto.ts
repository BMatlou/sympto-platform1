import { PartialType } from '@nestjs/mapped-types';
import { CreateInsuranceBenefitDto } from './create-insurance-benefit.dto';

export class UpdateInsuranceBenefitDto extends PartialType(CreateInsuranceBenefitDto) {}
