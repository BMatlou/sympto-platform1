import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingRepository } from './onboarding.repository';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    OnboardingController,
  ],
  providers: [
    OnboardingService,
    OnboardingRepository,
  ],
  exports: [
    OnboardingService,
  ],
})
export class OnboardingModule {}