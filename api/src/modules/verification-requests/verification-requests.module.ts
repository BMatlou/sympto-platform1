import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { VerificationRequestsController } from './verification-requests.controller';
import { VerificationRequestsService } from './verification-requests.service';

@Module({
  imports: [DatabaseModule],
  controllers: [VerificationRequestsController],
  providers: [VerificationRequestsService],
  exports: [VerificationRequestsService],
})
export class VerificationRequestsModule {}