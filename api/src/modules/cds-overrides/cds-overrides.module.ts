import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CdsOverridesController } from './cds-overrides.controller';
import { CdsOverridesService } from './cds-overrides.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CdsOverridesController],
  providers: [CdsOverridesService],
  exports: [CdsOverridesService],
})
export class CdsOverridesModule {}