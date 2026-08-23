import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAdherenceGoalDto {
  @IsString()
  title!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  targetPercent!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  windowDays?: number;
}
