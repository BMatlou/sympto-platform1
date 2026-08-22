import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CdsAlertsController } from './cds-alerts.controller';
import { CdsAlertsService } from './cds-alerts.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CdsAlertsController],
  providers: [CdsAlertsService],
  exports: [CdsAlertsService],
})
export class CdsAlertsModule {}