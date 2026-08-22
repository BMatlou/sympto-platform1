import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DeviceTokensController } from './device-tokens.controller';
import { DeviceTokensService } from './device-tokens.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    DeviceTokensController,
  ],
  providers: [
    DeviceTokensService,
  ],
  exports: [
    DeviceTokensService,
  ],
})
export class DeviceTokensModule {}