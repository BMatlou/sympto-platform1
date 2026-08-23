import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthHomeController } from './health-home.controller';
import { HealthHomeService } from './health-home.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthHomeController],
  providers: [HealthHomeService],
  exports: [HealthHomeService],
})
export class HealthHomeModule {}
