import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PublicHealthReportsController } from './public-health-reports.controller';
import { PublicHealthReportsService } from './public-health-reports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicHealthReportsController],
  providers: [PublicHealthReportsService],
  exports: [PublicHealthReportsService],
})
export class PublicHealthReportsModule {}