import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class UpdateHealthWeightDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(500)
  weightKg!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(250)
  heightCm?: number;
}
