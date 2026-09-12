import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthHomeModule } from '../health-home/health-home.module';

import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientsRepository } from './patients.repository';

@Module({
  imports: [DatabaseModule, HealthHomeModule],

  controllers: [PatientsController],

  providers: [PatientsService, PatientsRepository],

  exports: [PatientsService],
})
export class PatientsModule {}