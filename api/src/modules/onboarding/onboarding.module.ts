import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthHomeModule } from '../health-home/health-home.module';

import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingRepository } from './onboarding.repository';
import { ProfileRecordController } from './profile-record.controller';
import { ProfileRecordService } from './profile-record.service';
import { PatientHealthRecordController } from './patient-health-record.controller';

@Module({
  imports: [
    DatabaseModule,
    HealthHomeModule,
  ],
  controllers: [
    OnboardingController,
    ProfileRecordController,
    PatientHealthRecordController,
  ],
  providers: [
    OnboardingService,
    OnboardingRepository,
    ProfileRecordService,
  ],
  exports: [
    OnboardingService,
    ProfileRecordService,
  ],
})
export class OnboardingModule {}
