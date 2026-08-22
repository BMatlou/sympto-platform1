import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCdsOverrideDto {
  @IsUUID()
  clinicalDecisionSupportId!: string;

  @IsUUID()
  practitionerId!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  comments?: string;
}