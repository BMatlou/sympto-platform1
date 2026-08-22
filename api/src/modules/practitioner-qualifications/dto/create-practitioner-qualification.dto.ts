import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreatePractitionerQualificationDto {
  @IsUUID()
  practitionerId!: string;

  @IsUUID()
  qualificationId!: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(3000)
  graduationYear?: number;
}