import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabDisciplinesController } from './lab-disciplines.controller';
import { LabDisciplinesService } from './lab-disciplines.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabDisciplinesController],
  providers: [LabDisciplinesService],
  exports: [LabDisciplinesService],
})
export class LabDisciplinesModule {}