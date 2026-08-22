import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AccessLogsController } from './access-logs.controller';
import { AccessLogsService } from './access-logs.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AccessLogsController,
  ],

  providers: [
    AccessLogsService,
  ],

  exports: [
    AccessLogsService,
  ],
})
export class AccessLogsModule {}