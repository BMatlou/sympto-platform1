import { PartialType } from '@nestjs/mapped-types';

import { CreateTenantSettingDto } from './create-tenant-setting.dto';

export class UpdateTenantSettingDto extends PartialType(
  CreateTenantSettingDto,
) {}