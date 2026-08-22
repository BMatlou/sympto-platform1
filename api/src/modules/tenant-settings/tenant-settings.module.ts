import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { TenantSettingsController } from './tenant-settings.controller';
import { TenantSettingsService } from './tenant-settings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    TenantSettingsController,
  ],
  providers: [
    TenantSettingsService,
  ],
  exports: [
    TenantSettingsService,
  ],
})
export class TenantSettingsModule {}