import { IsBoolean, IsString } from 'class-validator';

export class LinkFamilyMemberDto {
  @IsString()
  ownerPatientId!: string;

  @IsString()
  memberPatientId!: string;

  @IsString()
  relationship!: string;

  @IsBoolean()
  canViewRecords!: boolean;

  @IsBoolean()
  canManageAppointments!: boolean;

  @IsBoolean()
  canReceiveAlerts!: boolean;
}