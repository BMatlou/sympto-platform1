import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { HealthPassportsController } from './health-passports.controller';
import { HealthPassportsService } from './health-passports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthPassportsController],
  providers: [HealthPassportsService],
  exports: [HealthPassportsService],
})
export class HealthPassportsModule {}