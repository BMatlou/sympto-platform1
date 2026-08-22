import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingProceduresController } from './imaging-procedures.controller';
import { ImagingProceduresService } from './imaging-procedures.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingProceduresController],
  providers: [ImagingProceduresService],
  exports: [ImagingProceduresService],
})
export class ImagingProceduresModule {}