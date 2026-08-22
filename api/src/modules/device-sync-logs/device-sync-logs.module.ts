import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DeviceSyncLogsController } from './device-sync-logs.controller';
import { DeviceSyncLogsService } from './device-sync-logs.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    DeviceSyncLogsController,
  ],

  providers: [
    DeviceSyncLogsService,
  ],

  exports: [
    DeviceSyncLogsService,
  ],
})
export class DeviceSyncLogsModule {}