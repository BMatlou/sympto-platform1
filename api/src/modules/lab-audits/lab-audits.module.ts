import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabAuditsController } from './lab-audits.controller';
import { LabAuditsService } from './lab-audits.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabAuditsController],
  providers: [LabAuditsService],
  exports: [LabAuditsService],
})
export class LabAuditsModule {}