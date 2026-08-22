import {
  IsJSON,
  IsUUID,
} from 'class-validator';

export class CreateTenantSettingDto {
  @IsUUID()
  organizationId!: string;

  @IsJSON()
  settings: any;
}