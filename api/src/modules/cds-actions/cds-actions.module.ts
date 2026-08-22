import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CdsActionsController } from './cds-actions.controller';
import { CdsActionsService } from './cds-actions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CdsActionsController],
  providers: [CdsActionsService],
  exports: [CdsActionsService],
})
export class CdsActionsModule {}