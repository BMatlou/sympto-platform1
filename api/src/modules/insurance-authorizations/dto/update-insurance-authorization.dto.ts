import { PartialType } from '@nestjs/mapped-types';
import { CreateInsuranceAuthorizationDto } from './create-insurance-authorization.dto';

export class UpdateInsuranceAuthorizationDto extends PartialType(CreateInsuranceAuthorizationDto) {}
