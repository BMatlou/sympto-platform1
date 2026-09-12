import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsModule } from '../health-goals/health-goals.module';

import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientsRepository } from './patients.repository';

@Module({
  imports: [DatabaseModule, HealthGoalsModule],

  controllers: [PatientsController],

  providers: [PatientsService, PatientsRepository],

  exports: [PatientsService],
})
export class PatientsModule {}
