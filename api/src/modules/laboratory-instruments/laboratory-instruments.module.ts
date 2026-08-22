import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LaboratoryInstrumentsController } from './laboratory-instruments.controller';
import { LaboratoryInstrumentsService } from './laboratory-instruments.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LaboratoryInstrumentsController],
  providers: [LaboratoryInstrumentsService],
  exports: [LaboratoryInstrumentsService],
})
export class LaboratoryInstrumentsModule {}