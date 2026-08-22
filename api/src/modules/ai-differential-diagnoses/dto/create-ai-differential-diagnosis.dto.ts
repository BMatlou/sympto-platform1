import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateAIDifferentialDiagnosisDto {
  @IsUUID()
  assessmentId!: string;

  @IsString()
  diagnosis!: string;

  @IsOptional()
  @IsNumber(
    {
      maxDecimalPlaces: 2,
    },
  )
  @Min(0)
  @Max(100)
  probability?: number;

  @IsInt()
  @Min(1)
  rank!: number;
}