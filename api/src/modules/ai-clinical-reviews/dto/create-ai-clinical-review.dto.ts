import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAIClinicalReviewDto {
  @IsUUID()
  assessmentId!: string;

  @IsUUID()
  practitionerId!: string;

  @IsBoolean()
  agreed!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}