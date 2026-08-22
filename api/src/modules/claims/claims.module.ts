import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    ClaimsController,
  ],
  providers: [
    ClaimsService,
  ],
  exports: [
    ClaimsService,
  ],
})
export class ClaimsModule {}