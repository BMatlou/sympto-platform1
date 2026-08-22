import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateAISymptomDto {
  @IsUUID()
  assessmentId!: string;

  @IsString()
  symptomId!: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  severity?: number;

  @IsOptional()
  @IsBoolean()
  present?: boolean;
}