import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePublicHealthSubmissionDto {
  @IsUUID()
  reportId!: string;

  @IsString()
  destination!: string;

  @IsOptional()
  @IsString()
  responseCode?: string;

  @IsOptional()
  @IsString()
  responseMessage?: string;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}