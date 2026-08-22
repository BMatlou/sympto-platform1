import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabUnitsController } from './lab-units.controller';
import { LabUnitsService } from './lab-units.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabUnitsController],
  providers: [LabUnitsService],
  exports: [LabUnitsService],
})
export class LabUnitsModule {}