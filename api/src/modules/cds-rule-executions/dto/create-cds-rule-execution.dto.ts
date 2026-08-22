import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateCdsRuleExecutionDto {
  @IsUUID()
  ruleId!: string;

  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsBoolean()
  triggered!: boolean;

  @IsOptional()
  @IsNumber()
  score?: number;
}