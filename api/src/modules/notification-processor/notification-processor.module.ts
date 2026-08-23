import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { NotificationProcessorService } from './notification-processor.service';

@Module({
  imports: [DatabaseModule],
  providers: [NotificationProcessorService],
})
export class NotificationProcessorModule {}
