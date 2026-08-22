import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationTemplatesService } from './notification-templates.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    NotificationTemplatesController,
  ],
  providers: [
    NotificationTemplatesService,
  ],
  exports: [
    NotificationTemplatesService,
  ],
})
export class NotificationTemplatesModule {}