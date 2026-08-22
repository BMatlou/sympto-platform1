import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PublicHealthSubmissionsController } from './public-health-submissions.controller';
import { PublicHealthSubmissionsService } from './public-health-submissions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicHealthSubmissionsController],
  providers: [PublicHealthSubmissionsService],
  exports: [PublicHealthSubmissionsService],
})
export class PublicHealthSubmissionsModule {}