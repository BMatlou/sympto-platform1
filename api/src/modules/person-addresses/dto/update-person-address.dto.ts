import { PartialType } from '@nestjs/mapped-types';

import { CreatePersonAddressDto } from './create-person-address.dto';

export class UpdatePersonAddressDto extends PartialType(
  CreatePersonAddressDto,
) {}