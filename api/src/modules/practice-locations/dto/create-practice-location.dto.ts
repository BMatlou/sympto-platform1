import {
  IsLatitude,
  IsLongitude,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreatePracticeLocationDto {
  @IsUUID()
  practiceId!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  radiusKm?: number;
}