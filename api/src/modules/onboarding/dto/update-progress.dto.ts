import {
  IsEnum,
  IsInt,
  Max,
  Min,
} from 'class-validator';

import { OnboardingStatus } from '@prisma/client';

export class UpdateProgressDto {
  @IsInt()
  @Min(1)
  currentStep!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  completionPercentage!: number;

  @IsEnum(OnboardingStatus)
  status!: OnboardingStatus;
}