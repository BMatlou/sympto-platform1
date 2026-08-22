import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SymptomLogsController } from './symptom-logs.controller';
import { SymptomLogsService } from './symptom-logs.service';

@Module({
  imports: [DatabaseModule],

  controllers: [SymptomLogsController],

  providers: [SymptomLogsService],

  exports: [SymptomLogsService],
})
export class SymptomLogsModule {}