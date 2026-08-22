import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { MembershipRole } from '@prisma/client';

export class CreateOrganizationMemberDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  userId!: string;

  @IsEnum(MembershipRole)
  role!: MembershipRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}