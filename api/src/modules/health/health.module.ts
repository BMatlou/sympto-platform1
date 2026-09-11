import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HealthController } from './health.controller';
import { HealthHomeController } from './health-home.controller';
import { HealthHomeService } from './health-home.service';
import { ClinicCardController } from './clinic-card.controller';
import { ClinicCardService } from './clinic-card.service';
import { ClinicCardProfileService } from './clinic-card-profile.service';
import { PatientContextService } from './patient-context.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, HealthHomeController, ClinicCardController],
  providers: [HealthHomeService, ClinicCardService, ClinicCardProfileService, PatientContextService],
})
export class HealthModule {}
