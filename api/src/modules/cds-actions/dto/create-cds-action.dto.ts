import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCdsActionDto {
  @IsUUID()
  clinicalDecisionSupportId!: string;

  @IsUUID()
  userId!: string;

  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}