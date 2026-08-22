import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ResultVerificationsController } from './result-verifications.controller';
import { ResultVerificationsService } from './result-verifications.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ResultVerificationsController],
  providers: [ResultVerificationsService],
  exports: [ResultVerificationsService],
})
export class ResultVerificationsModule {}